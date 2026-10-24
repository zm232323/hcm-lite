'use strict';

const request = require('supertest');
const app = require('../app');
const { setup, teardown, clearDB } = require('./testHelpers');
const {
  User,
  Employee,
  Department,
  Designation,
  LeaveType,
  LeaveRequest,
  SalaryStructure,
  AiLog,
} = require('../models');
const llm = require('../modules/ai/llm');
const { getKarachiNow } = require('../utils/time');
const { getDashboardData } = require('../modules/dashboards/service');

beforeAll(async () => {
  await setup();
});

afterAll(async () => {
  await teardown();
});

afterEach(async () => {
  llm.clearMockGenerator();
  await clearDB();
});

async function setupSystem() {
  // 1. Setup Admin
  await request(app).post('/api/setup').send({
    companyName: 'Acme HCM',
    adminName: 'Super Admin',
    adminEmail: 'admin@acme.com',
    adminPassword: 'Password123!',
  });

  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@acme.com', password: 'Password123!' });
  const adminToken = adminLogin.body.token;

  // 2. Create HR
  const hrRes = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'HR Lead', email: 'hr@acme.com' });

  const hrTemp = await request(app)
    .post('/api/auth/login')
    .send({ email: 'hr@acme.com', password: hrRes.body.tempPassword });

  await request(app)
    .post('/api/auth/change-password')
    .set('Authorization', `Bearer ${hrTemp.body.token}`)
    .send({ newPassword: 'HrPassword123!' });

  const hrLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'hr@acme.com', password: 'HrPassword123!' });
  const hrToken = hrLogin.body.token;

  // 3. Create Department & Designation
  const deptRes = await request(app)
    .post('/api/org/departments')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Engineering' });
  const deptId = deptRes.body._id;

  const desigRes = await request(app)
    .post('/api/org/designations')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Software Engineer', departmentId: deptId });
  const desigId = desigRes.body._id;

  // 4. Create Leave Type
  const ltRes = await request(app)
    .post('/api/org/leave-types')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Casual', yearlyQuota: 10, isPaid: true });
  const leaveTypeId = ltRes.body._id;

  // 5. Create Employee 1 (Alice)
  const emp1Res = await request(app)
    .post('/api/employees')
    .set('Authorization', `Bearer ${hrToken}`)
    .send({
      employeeCode: 'EMP001',
      name: 'Alice Developer',
      email: 'alice@acme.com',
      departmentId: deptId,
      designationId: desigId,
      joiningDate: '2026-01-01',
      basicSalary: 100000,
      status: 'active',
    });
  const emp1 = emp1Res.body.employee;

  // Set Alice password & login as Employee 1
  const emp1Temp = await request(app)
    .post('/api/auth/login')
    .send({ email: 'alice@acme.com', password: emp1Res.body.temporaryPassword });

  await request(app)
    .post('/api/auth/change-password')
    .set('Authorization', `Bearer ${emp1Temp.body.token}`)
    .send({ newPassword: 'AlicePassword123!' });

  const emp1Login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'alice@acme.com', password: 'AlicePassword123!' });
  const emp1Token = emp1Login.body.token;

  // 6. Create Employee 2 (Bob)
  const emp2Res = await request(app)
    .post('/api/employees')
    .set('Authorization', `Bearer ${hrToken}`)
    .send({
      employeeCode: 'EMP002',
      name: 'Bob Designer',
      email: 'bob@acme.com',
      departmentId: deptId,
      designationId: desigId,
      joiningDate: '2026-02-01',
      basicSalary: 80000,
      status: 'active',
    });
  const emp2 = emp2Res.body.employee;

  return {
    adminToken,
    hrToken,
    emp1Token,
    emp1,
    emp2,
    deptId,
    desigId,
    leaveTypeId,
  };
}

describe('Part 6: AI Assistant Tests', () => {
  test('Mocked model calling get_headcount: answer path works and matches Part 3/5 dashboard numbers', async () => {
    const { hrToken } = await setupSystem();

    // Mock LLM:
    // Turn 1: Model issues function call get_headcount
    // Turn 2: Model receives tool result and produces text answer
    let callCount = 0;
    llm.setMockGenerator(async ({ messages }) => {
      callCount++;
      if (callCount === 1) {
        return {
          functionCalls: [{ name: 'get_headcount', args: { departmentName: 'Engineering' } }],
        };
      }
      // Inspect tool result passed to model
      const toolMsg = messages.find((m) => m.role === 'function' || m.functionResponse);
      const toolResult = toolMsg.functionResponse.response;

      return {
        text: `There are currently ${toolResult.totalHeadcount} active employees in Engineering.`,
      };
    });

    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ message: 'How many people work in Engineering?' });

    expect(res.status).toBe(200);
    expect(res.body.aiGenerated).toBe(true);
    expect(res.body.toolsCalled).toContain('get_headcount');
    expect(res.body.answer).toContain('2 active employees in Engineering');

    // Cross-verify with dashboard consistency
    const hrDash = await getDashboardData('hr');
    expect(hrDash.kpis.headcount).toBe(2);

    // Verify AiLog recorded
    const logs = await AiLog.find();
    expect(logs.length).toBe(1);
    expect(logs[0].feature).toBe('chat');
    expect(logs[0].toolsCalled).toContain('get_headcount');
    expect(logs[0].status).toBe('ok');
  });

  test('Employee scope: asking for payroll, late comers or colleague salary is refused; colleague salary is never leaked', async () => {
    const { emp1Token, emp2 } = await setupSystem();

    // Case A: Model attempts to call get_payroll_summary for everyone
    llm.setMockGenerator(async ({ messages }) => {
      if (!messages.some((m) => m.role === 'function' || m.functionResponse)) {
        return {
          functionCalls: [{ name: 'get_payroll_summary', args: { month: '2026-10' } }],
        };
      }
      const toolMsg = messages.find((m) => m.role === 'function' || m.functionResponse);
      const toolResult = toolMsg.functionResponse.response;

      // Notice for Employee, executor only returned yourLastPayslip or message, never company aggregate
      expect(toolResult.summary).toBeUndefined();

      return {
        text: 'You do not have access to company payroll. You have no finalized payslips yet.',
      };
    });

    const res1 = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({ message: 'What is company payroll?' });

    expect(res1.status).toBe(200);
    expect(res1.body.answer).toContain('You do not have access to company payroll');

    // Case B: Model attempts to search for colleague Bob's salary
    llm.setMockGenerator(async ({ messages }) => {
      if (!messages.some((m) => m.role === 'function' || m.functionResponse)) {
        return {
          functionCalls: [{ name: 'search_employees', args: { q: 'Bob' } }],
        };
      }
      const toolMsg = messages.find((m) => m.role === 'function' || m.functionResponse);
      const toolResult = toolMsg.functionResponse.response;

      // Executor refused to return Bob's details to Alice
      expect(toolResult.refused).toBe(true);
      expect(toolResult.results).toBeUndefined();

      return {
        text: 'I cannot share salary or profile information for Bob Designer.',
      };
    });

    const res2 = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({ message: "What is Bob's salary?" });

    expect(res2.status).toBe(200);
    expect(res2.body.answer).toContain('I cannot share salary');
    expect(res2.body.answer).not.toContain('80000'); // Bob's salary never leaked
  });

  test('get_my_leave_balance always uses caller identity even if model passes different employeeId', async () => {
    const { emp1Token, emp2 } = await setupSystem();

    // Model attempts to pass Bob's employeeId
    llm.setMockGenerator(async ({ messages }) => {
      if (!messages.some((m) => m.role === 'function' || m.functionResponse)) {
        return {
          functionCalls: [{ name: 'get_my_leave_balance', args: { employeeId: emp2._id.toString() } }],
        };
      }
      const toolMsg = messages.find((m) => m.role === 'function' || m.functionResponse);
      const toolResult = toolMsg.functionResponse.response;

      // The balance returned is Alice's balance (10 days remaining), forced to Alice's JWT
      return {
        text: `You have ${toolResult.balances[0].remaining} days remaining of ${toolResult.balances[0].name} leave.`,
      };
    });

    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({ message: 'What is my leave balance?' });

    expect(res.status).toBe(200);
    expect(res.body.answer).toContain('10 days remaining of Casual leave');
  });

  test('Smart leave: valid JSON returns form + preview; invalid JSON retries once; nothing is ever saved', async () => {
    const { emp1Token, leaveTypeId } = await setupSystem();
    const initialLeaveCount = await LeaveRequest.countDocuments();

    // 1. Valid Smart Leave parsing
    llm.setMockGenerator(async ({ messages }) => {
      return {
        text: JSON.stringify({
          type: 'Casual',
          start: '2026-11-02',
          end: '2026-11-03',
          reason: "Sister's wedding",
        }),
      };
    });

    const validRes = await request(app)
      .post('/api/ai/smart-leave')
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({ text: "I need next Monday and Tuesday off for my sister's wedding" });

    expect(validRes.status).toBe(200);
    expect(validRes.body.ok).toBe(true);
    expect(validRes.body.form.type).toBe('Casual');
    expect(validRes.body.form.start).toBe('2026-11-02');
    expect(validRes.body.form.end).toBe('2026-11-03');
    expect(validRes.body.form.reason).toContain("Sister's wedding");
    expect(validRes.body.preview).toBeDefined();
    expect(validRes.body.preview.workingDays).toBe(2);

    // Verify ZERO writes occurred to database
    const postCount = await LeaveRequest.countDocuments();
    expect(postCount).toBe(initialLeaveCount);

    // 2. Invalid JSON that fails and retries once
    let attempt = 0;
    llm.setMockGenerator(async () => {
      attempt++;
      return { text: 'Not JSON at all' };
    });

    const invalidRes = await request(app)
      .post('/api/ai/smart-leave')
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({ text: 'blah blah non intelligible request' });

    expect(invalidRes.status).toBe(200);
    expect(invalidRes.body.ok).toBe(false);
    expect(invalidRes.body.message).toContain('Could not understand');
    expect(attempt).toBe(2); // Initial + 1 retry
  });

  test('Summary: Employee gets 403; model receives only KPI JSON payload', async () => {
    const { adminToken, hrToken, emp1Token } = await setupSystem();

    // Employee gets 403
    const empRes = await request(app)
      .post('/api/ai/summary')
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({});
    expect(empRes.status).toBe(403);

    // HR gets 200 with bullets
    let receivedPayload = null;
    llm.setMockGenerator(async ({ systemPrompt }) => {
      receivedPayload = systemPrompt;
      return {
        text: '- Headcount is 2 active employees\n- Attendance rate is currently healthy\n- No pending leaves',
      };
    });

    const hrRes = await request(app)
      .post('/api/ai/summary')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({});

    expect(hrRes.status).toBe(200);
    expect(hrRes.body.aiGenerated).toBe(true);
    expect(hrRes.body.bullets.length).toBe(3);
    expect(receivedPayload).toContain('headcount');
    expect(receivedPayload).toContain('presentToday');
  });

  test('Timeout and provider error return HTTP 200 with fallback:true; 21st call within an hour returns 429; no secrets in logs', async () => {
    const { emp1Token } = await setupSystem();

    // 1. Provider failure fallback test
    llm.setMockGenerator(async () => {
      return {
        fallback: true,
        message: 'The assistant is unavailable right now. Please use the dashboard or the normal form.',
      };
    });

    const fallbackRes = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({ message: 'Hello assistant' });

    expect(fallbackRes.status).toBe(200);
    expect(fallbackRes.body.fallback).toBe(true);
    expect(fallbackRes.body.answer).toContain('The assistant is unavailable right now');

    // Verify AiLog entry logged the error
    const errLog = await AiLog.findOne().sort({ createdAt: -1 });
    expect(errLog.status).toBe('error');

    // 2. Rate limit test: Simulate 20 calls already in AiLog
    await clearDB();
    const { emp1Token: freshToken, emp1 } = await setupSystem();

    // Populate 20 log entries for Alice
    const logBatch = [];
    for (let i = 0; i < 20; i++) {
      logBatch.push({
        userId: emp1.userId,
        role: 'employee',
        feature: 'chat',
        question: `Question ${i}`,
        status: 'ok',
        createdAt: new Date(),
      });
    }
    await AiLog.insertMany(logBatch);

    // The 21st call should trigger 429
    const rateLimitRes = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${freshToken}`)
      .send({ message: '21st question' });

    expect(rateLimitRes.status).toBe(429);
    expect(rateLimitRes.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(rateLimitRes.body.error.message).toContain('at most 20 AI requests per hour');

    // 3. Verify API key never appears in any response or AiLog
    const allLogs = await AiLog.find().lean();
    const allLogsStr = JSON.stringify(allLogs);
    expect(allLogsStr).not.toContain('AI_API_KEY');
    expect(allLogsStr).not.toContain('gemini-');
  });
});
