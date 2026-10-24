'use strict';
const request = require('supertest');
const app = require('../app');
const { setup, teardown, clearDB } = require('./testHelpers');
const { LeaveType, Holiday, Settings, LeaveRequest } = require('../models');

beforeAll(async () => {
  await setup();
});

afterAll(async () => {
  await teardown();
});

afterEach(async () => {
  await clearDB();
});

async function setupSystemWithEmployee() {
  await request(app).post('/api/setup').send({
    companyName: 'Test Corp',
    adminName: 'Admin',
    adminEmail: 'admin@test.com',
    adminPassword: 'Password123!',
  });

  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@test.com', password: 'Password123!' });
  const adminToken = adminLogin.body.token;

  // Create HR
  const hrRes = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'HR Manager', email: 'hr@test.com' });

  const hrTempLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'hr@test.com', password: hrRes.body.tempPassword });

  await request(app)
    .post('/api/auth/change-password')
    .set('Authorization', `Bearer ${hrTempLogin.body.token}`)
    .send({ newPassword: 'HrPassword123!' });

  const hrLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'hr@test.com', password: 'HrPassword123!' });
  const hrToken = hrLogin.body.token;

  // Create Department & Designation
  const deptRes = await request(app)
    .post('/api/org/departments')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Engineering' });

  const desigRes = await request(app)
    .post('/api/org/designations')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Engineer' });

  // Create Leave Types: Annual (5 days quota), Unpaid (null quota)
  const annualLtRes = await request(app)
    .post('/api/org/leave-types')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Annual Leave', yearlyQuota: 5, isPaid: true });

  const unpaidLtRes = await request(app)
    .post('/api/org/leave-types')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Unpaid Leave', yearlyQuota: null, isPaid: false });

  // Register Employee 1
  const emp1Res = await request(app)
    .post('/api/employees')
    .set('Authorization', `Bearer ${hrToken}`)
    .send({
      employeeCode: 'EMP001',
      name: 'Bob Employee',
      email: 'bob@test.com',
      departmentId: deptRes.body._id,
      designationId: desigRes.body._id,
      joiningDate: '2025-01-01',
      basicSalary: 70000,
    });

  const emp1Login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'bob@test.com', password: emp1Res.body.temporaryPassword });

  // Register Employee 2
  const emp2Res = await request(app)
    .post('/api/employees')
    .set('Authorization', `Bearer ${hrToken}`)
    .send({
      employeeCode: 'EMP002',
      name: 'Sarah Employee',
      email: 'sarah@test.com',
      departmentId: deptRes.body._id,
      designationId: desigRes.body._id,
      joiningDate: '2025-01-01',
      basicSalary: 75000,
    });

  const emp2Login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'sarah@test.com', password: emp2Res.body.temporaryPassword });

  return {
    adminToken,
    hrToken,
    annualLtId: annualLtRes.body._id,
    unpaidLtId: unpaidLtRes.body._id,
    emp1Token: emp1Login.body.token,
    emp1Id: emp1Res.body.employee._id,
    emp2Token: emp2Login.body.token,
    emp2Id: emp2Res.body.employee._id,
  };
}

describe('Leave Module', () => {
  it('1. Weekends and holidays are skipped when counting working days', async () => {
    const { emp1Token, annualLtId } = await setupSystemWithEmployee();

    // 2025-06-02 is Monday, 2025-06-08 is Sunday (7 calendar days, 5 working days)
    // Add Wednesday 2025-06-04 as a public Holiday
    await Holiday.create({ name: 'Eid Holiday', date: new Date('2025-06-04T00:00:00.000Z') });

    const previewRes = await request(app)
      .get('/api/leave/preview')
      .set('Authorization', `Bearer ${emp1Token}`)
      .query({
        leaveTypeId: annualLtId,
        startDate: '2025-06-02',
        endDate: '2025-06-08',
      });

    expect(previewRes.status).toBe(200);
    // 5 weekdays minus 1 holiday = 4 working days!
    expect(previewRes.body.workingDays).toBe(4);
    expect(previewRes.body.totalDays).toBe(7);
  });

  it('2. Overlapping leave request returns 422', async () => {
    const { emp1Token, annualLtId } = await setupSystemWithEmployee();

    // Apply for June 2 - June 4 (Mon to Wed)
    const firstLeave = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({
        leaveTypeId: annualLtId,
        startDate: '2025-06-02',
        endDate: '2025-06-04',
        reason: 'Family event',
      });
    expect(firstLeave.status).toBe(201);

    // Apply for overlapping June 3 - June 6
    const overlapLeave = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({
        leaveTypeId: annualLtId,
        startDate: '2025-06-03',
        endDate: '2025-06-06',
        reason: 'Overlapping request',
      });

    expect(overlapLeave.status).toBe(422);
  });

  it('3. Over-balance leave returns 422, while unpaid (null quota) is never over-balance', async () => {
    const { emp1Token, annualLtId, unpaidLtId } = await setupSystemWithEmployee();

    // Annual leave quota is 5 days. Requesting 2 weeks (10 working days) exceeds quota -> 422
    const overBalanceRes = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({
        leaveTypeId: annualLtId,
        startDate: '2025-07-07',
        endDate: '2025-07-18', // 10 working days
        reason: 'Long holiday',
      });
    expect(overBalanceRes.status).toBe(422);

    // Unpaid leave (null quota = unlimited) allows 10 working days -> 201
    const unpaidRes = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({
        leaveTypeId: unpaidLtId,
        startDate: '2025-07-07',
        endDate: '2025-07-18',
        reason: 'Unpaid personal break',
      });
    expect(unpaidRes.status).toBe(201);
    expect(unpaidRes.body.days).toBe(10);
  });

  it('4. Employee cannot decide a leave request (403)', async () => {
    const { emp1Token, emp2Token, annualLtId } = await setupSystemWithEmployee();

    const leaveRes = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({
        leaveTypeId: annualLtId,
        startDate: '2025-08-04',
        endDate: '2025-08-05',
        reason: 'Personal',
      });
    expect(leaveRes.status).toBe(201);
    const leaveId = leaveRes.body._id;

    // Employee 2 attempts to decide Employee 1's leave -> 403
    const decideRes = await request(app)
      .patch(`/api/leave/${leaveId}/decision`)
      .set('Authorization', `Bearer ${emp2Token}`)
      .send({ decision: 'approve' });
    expect(decideRes.status).toBe(403);
  });

  it('5. Deciding an already decided leave returns 409', async () => {
    const { emp1Token, hrToken, annualLtId } = await setupSystemWithEmployee();

    const leaveRes = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({
        leaveTypeId: annualLtId,
        startDate: '2025-09-01',
        endDate: '2025-09-02',
        reason: 'Doctor appointment',
      });
    const leaveId = leaveRes.body._id;

    // HR approves
    const firstDecision = await request(app)
      .patch(`/api/leave/${leaveId}/decision`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ decision: 'approve' });
    expect(firstDecision.status).toBe(200);
    expect(firstDecision.body.status).toBe('approved');

    // Attempting to decide again -> 409
    const secondDecision = await request(app)
      .patch(`/api/leave/${leaveId}/decision`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ decision: 'reject', comment: 'Changed mind' });
    expect(secondDecision.status).toBe(409);
  });
});
