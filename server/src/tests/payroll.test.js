'use strict';

const request = require('supertest');
const app = require('../app');
const { setup, teardown, clearDB } = require('./testHelpers');
const {
  Employee,
  Attendance,
  LeaveRequest,
  LeaveType,
  Holiday,
  PayrollRun,
  Payslip,
  SalaryStructure,
} = require('../models');
const { countWorkingDays } = require('../modules/attendance/service');
const { getKarachiNow } = require('../utils/time');

beforeAll(async () => {
  await setup();
});

afterAll(async () => {
  await teardown();
});

afterEach(async () => {
  await clearDB();
});

async function setupSystem() {
  // 1. Initial setup (creates Admin)
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

  // 2. Create HR user
  const hrRes = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'HR Lead', email: 'hr@acme.com' });

  const hrTempLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'hr@acme.com', password: hrRes.body.tempPassword });

  await request(app)
    .post('/api/auth/change-password')
    .set('Authorization', `Bearer ${hrTempLogin.body.token}`)
    .send({ newPassword: 'HrPassword123!' });

  const hrLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'hr@acme.com', password: 'HrPassword123!' });
  const hrToken = hrLogin.body.token;

  // 3. Department & Designation
  const deptRes = await request(app)
    .post('/api/org/departments')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Engineering' });
  const departmentId = deptRes.body._id;

  const desigRes = await request(app)
    .post('/api/org/designations')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Software Engineer' });
  const designationId = desigRes.body._id;

  // 4. Leave Types (Paid and Unpaid)
  const paidLt = await LeaveType.create({
    name: 'Annual Leave',
    code: 'AL',
    isPaid: true,
    yearlyQuota: 14,
    isActive: true,
  });

  const unpaidLt = await LeaveType.create({
    name: 'Unpaid Leave',
    code: 'UL',
    isPaid: false,
    yearlyQuota: null,
    isActive: true,
  });

  // 5. Employee 1 (Basic 100,000 -> Gross 150,000)
  const emp1Res = await request(app)
    .post('/api/employees')
    .set('Authorization', `Bearer ${hrToken}`)
    .send({
      employeeCode: 'EMP001',
      name: 'Alice Employee',
      email: 'alice@acme.com',
      departmentId,
      designationId,
      joiningDate: '2026-01-01',
      basicSalary: 100000,
      status: 'active',
    });

  const emp1TempLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'alice@acme.com', password: emp1Res.body.temporaryPassword });

  await request(app)
    .post('/api/auth/change-password')
    .set('Authorization', `Bearer ${emp1TempLogin.body.token}`)
    .send({ newPassword: 'AlicePassword123!' });

  const emp1Login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'alice@acme.com', password: 'AlicePassword123!' });
  const emp1Token = emp1Login.body.token;

  // 6. Employee 2 (Basic 80,000)
  const emp2Res = await request(app)
    .post('/api/employees')
    .set('Authorization', `Bearer ${hrToken}`)
    .send({
      employeeCode: 'EMP002',
      name: 'Bob Employee',
      email: 'bob@acme.com',
      departmentId,
      designationId,
      joiningDate: '2026-01-01',
      basicSalary: 80000,
      status: 'active',
    });

  const emp2TempLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'bob@acme.com', password: emp2Res.body.temporaryPassword });

  await request(app)
    .post('/api/auth/change-password')
    .set('Authorization', `Bearer ${emp2TempLogin.body.token}`)
    .send({ newPassword: 'BobPassword123!' });

  const emp2Login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'bob@acme.com', password: 'BobPassword123!' });
  const emp2Token = emp2Login.body.token;

  return {
    adminToken,
    hrToken,
    emp1Token,
    emp1: emp1Res.body.employee,
    emp2Token,
    emp2: emp2Res.body.employee,
    departmentId,
    designationId,
    paidLt,
    unpaidLt,
  };
}

describe('Payroll Lite Integration Tests', () => {
  test('Salary structure management, permissions, and Employee.basicSalary sync', async () => {
    const { adminToken, hrToken, emp1Token, emp1 } = await setupSystem();

    // 1. Employee cannot view or manage salary structure (403)
    const empForbidden = await request(app)
      .get('/api/payroll/salary')
      .set('Authorization', `Bearer ${emp1Token}`);
    expect(empForbidden.status).toBe(403);

    // 2. Admin can list structures (derived from basicSalary with default percentages)
    const adminList = await request(app)
      .get('/api/payroll/salary')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminList.status).toBe(200);
    expect(adminList.body.items.length).toBe(2);
    const emp1Item = adminList.body.items.find((i) => i.employeeCode === 'EMP001');
    expect(emp1Item.basic).toBe(100000);
    expect(emp1Item.hraPercent).toBe(40);
    expect(emp1Item.medicalPercent).toBe(10);
    expect(emp1Item.otherAllowance).toBe(0);
    expect(emp1Item.gross).toBe(150000); // 100k + 40k + 10k

    // 3. Admin cannot update salary structure (HR only -> 403)
    const adminPutForbidden = await request(app)
      .put(`/api/payroll/salary/${emp1._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ basic: 120000, hraPercent: 40, medicalPercent: 10, otherAllowance: 5000 });
    expect(adminPutForbidden.status).toBe(403);

    // 4. HR updates salary structure and syncs Employee.basicSalary
    const hrPut = await request(app)
      .put(`/api/payroll/salary/${emp1._id}`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ basic: 120000, hraPercent: 35, medicalPercent: 15, otherAllowance: 5000 });
    expect(hrPut.status).toBe(200);
    expect(hrPut.body.basic).toBe(120000);
    expect(hrPut.body.hraPercent).toBe(35);
    expect(hrPut.body.medicalPercent).toBe(15);
    expect(hrPut.body.otherAllowance).toBe(5000);
    expect(hrPut.body.gross).toBe(185000); // 120k + 42k + 18k + 5k

    // Verify Employee model was updated
    const updatedEmp = await Employee.findById(emp1._id);
    expect(updatedEmp.basicSalary).toBe(120000);
  });

  test('Payslip math: full month with no absences (Gross 150k -> Tax 10k -> Net 140k)', async () => {
    const { hrToken, emp1, emp2 } = await setupSystem();
    // Use a past month: September 2026
    const month = '2026-09';
    const workingDays = await countWorkingDays('2026-09-01', '2026-09-30');

    // Create attendance records for EMP001 for all working days in Sep 2026
    const { getDateRange, isWeekend } = require('../utils/time');
    const allDays = getDateRange('2026-09-01', '2026-09-30');
    for (const d of allDays) {
      if (!isWeekend(d, [0, 6])) {
        await Attendance.create({
          employeeId: emp1._id,
          date: d,
          checkInAt: new Date(d + 'T09:00:00Z'),
          checkOutAt: new Date(d + 'T18:00:00Z'),
          workedMinutes: 540,
          status: 'present',
        });
      }
    }

    const runRes = await request(app)
      .post('/api/payroll/runs')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ month });

    expect(runRes.status).toBe(201);
    expect(runRes.body.status).toBe('draft');
    expect(runRes.body.month).toBe(month);

    const slip = await Payslip.findOne({ runId: runRes.body._id, employeeId: emp1._id });
    expect(slip).toBeDefined();
    expect(slip.basic).toBe(100000);
    expect(slip.hra).toBe(40000);
    expect(slip.medical).toBe(10000);
    expect(slip.gross).toBe(150000);
    expect(slip.workingDays).toBe(workingDays);
    expect(slip.eligibleDays).toBe(workingDays);
    expect(slip.absentDays).toBe(0);
    expect(slip.unpaidLeaveDays).toBe(0);
    expect(slip.halfDays).toBe(0);
    expect(slip.deductionDays).toBe(0);
    expect(slip.deduction).toBe(0);
    expect(slip.tax).toBe(10000);
    expect(slip.netPay).toBe(140000);
  });

  test('Payslip math: 1 absent day, 1 unpaid leave day, 2 half days (= 1 deduction day), paid leave not deducted, late not deducted', async () => {
    const { hrToken, emp1, paidLt, unpaidLt } = await setupSystem();
    const month = '2026-09';
    const workingDays = await countWorkingDays('2026-09-01', '2026-09-30');
    const { getDateRange, isWeekend } = require('../utils/time');
    const workDays = getDateRange('2026-09-01', '2026-09-30').filter((d) => !isWeekend(d, [0, 6]));

    // Day 0: Unpaid leave day (1 day)
    await LeaveRequest.create({
      employeeId: emp1._id,
      leaveTypeId: unpaidLt._id,
      startDate: workDays[0],
      endDate: workDays[0],
      days: 1,
      reason: 'Unpaid personal leave',
      status: 'approved',
    });

    // Day 1 & Day 2: Half days (2 half days = 1 deduction day)
    await Attendance.create({
      employeeId: emp1._id,
      date: workDays[1],
      checkInAt: new Date(workDays[1] + 'T09:00:00Z'),
      checkOutAt: new Date(workDays[1] + 'T12:00:00Z'),
      workedMinutes: 180,
      status: 'half_day',
    });
    await Attendance.create({
      employeeId: emp1._id,
      date: workDays[2],
      checkInAt: new Date(workDays[2] + 'T09:00:00Z'),
      checkOutAt: new Date(workDays[2] + 'T12:00:00Z'),
      workedMinutes: 180,
      status: 'half_day',
    });

    // Day 3: Paid leave (Annual) -> should NOT be deducted
    await LeaveRequest.create({
      employeeId: emp1._id,
      leaveTypeId: paidLt._id,
      startDate: workDays[3],
      endDate: workDays[3],
      days: 1,
      reason: 'Annual vacation',
      status: 'approved',
    });

    // Day 4: Late attendance -> should NOT be deducted
    await Attendance.create({
      employeeId: emp1._id,
      date: workDays[4],
      checkInAt: new Date(workDays[4] + 'T09:45:00Z'),
      checkOutAt: new Date(workDays[4] + 'T18:00:00Z'),
      workedMinutes: 495,
      isLate: true,
      status: 'late',
    });

    // Day 5: Absent (no attendance, no leave)
    // Days 6..end: Present
    for (let i = 6; i < workDays.length; i++) {
      await Attendance.create({
        employeeId: emp1._id,
        date: workDays[i],
        checkInAt: new Date(workDays[i] + 'T09:00:00Z'),
        checkOutAt: new Date(workDays[i] + 'T18:00:00Z'),
        workedMinutes: 540,
        status: 'present',
      });
    }

    const runRes = await request(app)
      .post('/api/payroll/runs')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ month });

    expect(runRes.status).toBe(201);
    const slip = await Payslip.findOne({ runId: runRes.body._id, employeeId: emp1._id });

    // Deductions:
    // absentDays = 1 (Day 5)
    // unpaidLeaveDays = 1 (Day 0)
    // halfDays = 2 -> 0.5 * 2 = 1 (Day 1 & Day 2)
    // Total deductionDays = 1 + 1 + 1 = 3
    expect(slip.absentDays).toBe(1);
    expect(slip.unpaidLeaveDays).toBe(1);
    expect(slip.halfDays).toBe(2);
    expect(slip.deductionDays).toBe(3);

    const expectedPerDay = Math.round((150000 / workingDays + Number.EPSILON) * 100) / 100;
    const expectedDeduction = Math.round((expectedPerDay * 3 + Number.EPSILON) * 100) / 100;
    expect(slip.perDay).toBe(expectedPerDay);
    expect(slip.deduction).toBe(expectedDeduction);
    expect(slip.tax).toBe(10000);

    const expectedNet = Math.max(0, Math.round((150000 - expectedDeduction - 10000 + Number.EPSILON) * 100) / 100);
    expect(slip.netPay).toBe(expectedNet);
  });

  test('Proration: Joiner mid-month and Leaver mid-month', async () => {
    const { hrToken, departmentId, designationId } = await setupSystem();
    const month = '2026-09';
    const workingDays = await countWorkingDays('2026-09-01', '2026-09-30');

    // Joiner mid-month: joiningDate = '2026-09-15'
    const joinerRes = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        employeeCode: 'JOIN01',
        name: 'Mid Joiner',
        email: 'joiner@acme.com',
        departmentId,
        designationId,
        joiningDate: '2026-09-15',
        basicSalary: 100000,
        status: 'active',
      });
    const joiner = joinerRes.body.employee;

    // Leaver mid-month: exitDate = '2026-09-15'
    const leaverRes = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        employeeCode: 'LEAV01',
        name: 'Mid Leaver',
        email: 'leaver@acme.com',
        departmentId,
        designationId,
        joiningDate: '2025-01-01',
        basicSalary: 100000,
        status: 'active',
      });
    const leaverId = leaverRes.body.employee._id;
    await request(app)
      .put(`/api/employees/${leaverId}`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        status: 'exited',
        exitDate: '2026-09-15',
      });
    const leaver = await Employee.findById(leaverId);


    const expectedJoinerDays = await countWorkingDays('2026-09-15', '2026-09-30');
    const expectedLeaverDays = await countWorkingDays('2026-09-01', '2026-09-15');

    const runRes = await request(app)
      .post('/api/payroll/runs')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ month });

    expect(runRes.status).toBe(201);

    const joinerSlip = await Payslip.findOne({ runId: runRes.body._id, employeeId: joiner._id });
    expect(joinerSlip.workingDays).toBe(workingDays);
    expect(joinerSlip.eligibleDays).toBe(expectedJoinerDays);
    expect(joinerSlip.earnedGross).toBe(
      Math.round((joinerSlip.perDay * expectedJoinerDays + Number.EPSILON) * 100) / 100
    );

    const leaverSlip = await Payslip.findOne({ runId: runRes.body._id, employeeId: leaver._id });
    expect(leaverSlip.workingDays).toBe(workingDays);
    expect(leaverSlip.eligibleDays).toBe(expectedLeaverDays);
    expect(leaverSlip.earnedGross).toBe(
      Math.round((leaverSlip.perDay * expectedLeaverDays + Number.EPSILON) * 100) / 100
    );
  });

  test('Current month mid-month run: today and future days are NOT counted as absent', async () => {
    const { hrToken, emp1 } = await setupSystem();
    const { todayStr } = getKarachiNow();
    const currentMonth = todayStr.slice(0, 7);

    // Create run for current month without any attendance
    const runRes = await request(app)
      .post('/api/payroll/runs')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ month: currentMonth });

    expect(runRes.status).toBe(201);
    const slip = await Payslip.findOne({ runId: runRes.body._id, employeeId: emp1._id });

    // The absent days must NOT include today or days in the future
    const { getDateRange, isWeekend } = require('../utils/time');
    const pastDays = getDateRange(currentMonth + '-01', todayStr)
      .slice(0, -1) // strictly before today
      .filter((d) => !isWeekend(d, [0, 6]));

    // All strictly past working days with no attendance are absent
    expect(slip.absentDays).toBe(pastDays.length);
  });

  test('Validation & RBAC rules: duplicate month 409, future month 422, HR cannot finalize 403, Employee cannot create/read runs 403', async () => {
    const { adminToken, hrToken, emp1Token } = await setupSystem();

    // 1. Future month returns 422
    const futureRes = await request(app)
      .post('/api/payroll/runs')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ month: '2099-01' });
    expect(futureRes.status).toBe(422);

    // 2. HR creates draft for valid past month
    const runRes = await request(app)
      .post('/api/payroll/runs')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ month: '2026-08' });
    expect(runRes.status).toBe(201);
    const runId = runRes.body._id;

    // 3. Duplicate month returns 409
    const dupRes = await request(app)
      .post('/api/payroll/runs')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ month: '2026-08' });
    expect(dupRes.status).toBe(409);

    // 4. Employee cannot create a run (403)
    const empCreateRes = await request(app)
      .post('/api/payroll/runs')
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({ month: '2026-07' });
    expect(empCreateRes.status).toBe(403);

    // 5. Employee cannot read run list (403)
    const empListRes = await request(app)
      .get('/api/payroll/runs')
      .set('Authorization', `Bearer ${emp1Token}`);
    expect(empListRes.status).toBe(403);

    // 6. HR cannot finalize run (Admin only -> 403)
    const hrFinalizeRes = await request(app)
      .post(`/api/payroll/runs/${runId}/finalize`)
      .set('Authorization', `Bearer ${hrToken}`);
    expect(hrFinalizeRes.status).toBe(403);

    // 7. Admin finalizes run successfully
    const adminFinalizeRes = await request(app)
      .post(`/api/payroll/runs/${runId}/finalize`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminFinalizeRes.status).toBe(200);
    expect(adminFinalizeRes.body.status).toBe('finalized');
  });

  test('Finalized run locks: recalculate, delete return 409; subsequent salary changes do not alter snapshot', async () => {
    const { adminToken, hrToken, emp1 } = await setupSystem();
    const runRes = await request(app)
      .post('/api/payroll/runs')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ month: '2026-07' });
    const runId = runRes.body._id;

    // Admin finalizes
    await request(app)
      .post(`/api/payroll/runs/${runId}/finalize`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Recalculate returns 409
    const recalcRes = await request(app)
      .post(`/api/payroll/runs/${runId}/recalculate`)
      .set('Authorization', `Bearer ${hrToken}`);
    expect(recalcRes.status).toBe(409);

    // Delete returns 409
    const deleteRes = await request(app)
      .delete(`/api/payroll/runs/${runId}`)
      .set('Authorization', `Bearer ${hrToken}`);
    expect(deleteRes.status).toBe(409);

    // Get snapshot before salary change
    const slipBefore = await Payslip.findOne({ runId, employeeId: emp1._id });
    expect(slipBefore.basic).toBe(100000);

    // HR changes salary structure to 200,000
    await request(app)
      .put(`/api/payroll/salary/${emp1._id}`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ basic: 200000, hraPercent: 40, medicalPercent: 10, otherAllowance: 0 });

    // Finalized payslip snapshot remains completely unchanged
    const slipAfter = await Payslip.findOne({ runId, employeeId: emp1._id });
    expect(slipAfter.basic).toBe(100000);
    expect(slipAfter.gross).toBe(slipBefore.gross);
    expect(slipAfter.netPay).toBe(slipBefore.netPay);
  });

  test('Payslip security & PDF streaming: employee cannot view others payslip or draft; PDF streams application/pdf', async () => {
    const { adminToken, hrToken, emp1Token, emp2Token, emp1, emp2 } = await setupSystem();

    // 1. Create draft run
    const runRes = await request(app)
      .post('/api/payroll/runs')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ month: '2026-06' });
    const runId = runRes.body._id;

    const emp1Slip = await Payslip.findOne({ runId, employeeId: emp1._id });
    const emp2Slip = await Payslip.findOne({ runId, employeeId: emp2._id });

    // 2. In draft status, Employee cannot read their own payslip (403)
    const draftRead = await request(app)
      .get(`/api/payroll/payslips/${emp1Slip._id}`)
      .set('Authorization', `Bearer ${emp1Token}`);
    expect(draftRead.status).toBe(403);

    // 3. Admin finalizes the run
    await request(app)
      .post(`/api/payroll/runs/${runId}/finalize`)
      .set('Authorization', `Bearer ${adminToken}`);

    // 4. Employee 1 can read their own finalized payslip
    const mySlipRes = await request(app)
      .get(`/api/payroll/payslips/${emp1Slip._id}`)
      .set('Authorization', `Bearer ${emp1Token}`);
    expect(mySlipRes.status).toBe(200);
    expect(mySlipRes.body.payslip.employeeCode).toBe('EMP001');

    // 5. Employee 1 gets their list via /me
    const meRes = await request(app)
      .get('/api/payroll/payslips/me')
      .set('Authorization', `Bearer ${emp1Token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.length).toBe(1);
    expect(meRes.body[0]._id).toBe(emp1Slip._id.toString());

    // 6. Employee 1 CANNOT read Employee 2's payslip (403)
    const otherRead = await request(app)
      .get(`/api/payroll/payslips/${emp2Slip._id}`)
      .set('Authorization', `Bearer ${emp1Token}`);
    expect(otherRead.status).toBe(403);

    // 7. Employee 1 CANNOT download Employee 2's PDF (403)
    const otherPdf = await request(app)
      .get(`/api/payroll/payslips/${emp2Slip._id}/pdf`)
      .set('Authorization', `Bearer ${emp1Token}`);
    expect(otherPdf.status).toBe(403);

    // 8. Employee 1 CAN download their own PDF with application/pdf header
    const myPdf = await request(app)
      .get(`/api/payroll/payslips/${emp1Slip._id}/pdf`)
      .set('Authorization', `Bearer ${emp1Token}`);
    expect(myPdf.status).toBe(200);
    expect(myPdf.headers['content-type']).toContain('application/pdf');
    expect(myPdf.body).toBeDefined();
  });
});
