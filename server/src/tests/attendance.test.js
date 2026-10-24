'use strict';
const request = require('supertest');
const app = require('../app');
const { setup, teardown, clearDB } = require('./testHelpers');
const { Settings, Holiday, Attendance } = require('../models');
const { getKarachiDate, getKarachiNow } = require('../utils/time');

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
    companyName: 'Test Tech',
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
    .send({ name: 'HR Lead', email: 'hr@test.com' });

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
    .send({ name: 'Dev' });

  // Register Employee 1
  const emp1Res = await request(app)
    .post('/api/employees')
    .set('Authorization', `Bearer ${hrToken}`)
    .send({
      employeeCode: 'EMP001',
      name: 'John Emp',
      email: 'john@test.com',
      departmentId: deptRes.body._id,
      designationId: desigRes.body._id,
      joiningDate: '2025-01-01',
      basicSalary: 60000,
    });

  const emp1Login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'john@test.com', password: emp1Res.body.temporaryPassword });

  // Register Employee 2
  const emp2Res = await request(app)
    .post('/api/employees')
    .set('Authorization', `Bearer ${hrToken}`)
    .send({
      employeeCode: 'EMP002',
      name: 'Jane Emp',
      email: 'jane@test.com',
      departmentId: deptRes.body._id,
      designationId: desigRes.body._id,
      joiningDate: '2025-01-01',
      basicSalary: 65000,
    });

  const emp2Login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'jane@test.com', password: emp2Res.body.temporaryPassword });

  return {
    adminToken,
    hrToken,
    emp1Token: emp1Login.body.token,
    emp1Id: emp1Res.body.employee._id,
    emp2Token: emp2Login.body.token,
    emp2Id: emp2Res.body.employee._id,
  };
}

describe('Attendance Module', () => {
  it('1. Check-in succeeds and second check-in on the same day returns 409', async () => {
    const { emp1Token } = await setupSystemWithEmployee();

    // Ensure today is treated as a working day for test
    const { dayOfWeek } = getKarachiNow();
    await Settings.findOneAndUpdate({}, { weekend: [dayOfWeek === 0 ? 1 : 0] }); // Ensure today is not in weekend

    const firstCheckIn = await request(app)
      .post('/api/attendance/check-in')
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({});
    expect(firstCheckIn.status).toBe(201);
    expect(firstCheckIn.body.status).toBeDefined();

    // Second check-in today -> 409
    const secondCheckIn = await request(app)
      .post('/api/attendance/check-in')
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({});
    expect(secondCheckIn.status).toBe(409);
  });

  it('2. Time cannot be sent by client (server time is authoritative)', async () => {
    const { emp1Token } = await setupSystemWithEmployee();
    const { dayOfWeek } = getKarachiNow();
    await Settings.findOneAndUpdate({}, { weekend: [dayOfWeek === 0 ? 1 : 0] });

    // Client passes a forged time in 1999
    const forgedTime = '1999-01-01T00:00:00.000Z';
    const res = await request(app)
      .post('/api/attendance/check-in')
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({ checkInAt: forgedTime, date: '1999-01-01' });

    expect(res.status).toBe(201);
    // Server time must be current year, not 1999!
    const checkInYear = new Date(res.body.checkInAt).getFullYear();
    expect(checkInYear).toBeGreaterThan(2020);
  });

  it('3. Check-in on a weekend or public holiday returns 422', async () => {
    const { emp1Token } = await setupSystemWithEmployee();
    const { todayStr, dayOfWeek } = getKarachiNow();

    // Make today a weekend in settings
    await Settings.findOneAndUpdate({}, { weekend: [dayOfWeek] });

    const weekendRes = await request(app)
      .post('/api/attendance/check-in')
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({});
    expect(weekendRes.status).toBe(422);

    // Now remove today from weekend, but add today as a Holiday
    await Settings.findOneAndUpdate({}, { weekend: [dayOfWeek === 0 ? 1 : 0] });
    await Holiday.create({ name: 'Special Holiday', date: new Date(todayStr + 'T12:00:00Z') });

    const holidayRes = await request(app)
      .post('/api/attendance/check-in')
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({});
    expect(holidayRes.status).toBe(422);
  });

  it('4. Check-out under 5 hours gives half_day status', async () => {
    const { emp1Token, emp1Id } = await setupSystemWithEmployee();
    const { now, todayStr, dayOfWeek } = getKarachiNow();
    await Settings.findOneAndUpdate({}, { weekend: [dayOfWeek === 0 ? 1 : 0], halfDayHours: 5 });

    // Simulate check-in 2 hours ago
    const checkInTime = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    await Attendance.create({
      employeeId: emp1Id,
      date: todayStr,
      checkInAt: checkInTime,
      source: 'web',
      isLate: false,
      status: 'present',
    });

    const checkOutRes = await request(app)
      .post('/api/attendance/check-out')
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({});

    expect(checkOutRes.status).toBe(200);
    expect(checkOutRes.body.status).toBe('half_day');
    expect(checkOutRes.body.workedMinutes).toBeGreaterThanOrEqual(119);
  });

  it('5. Employee cannot decide an attendance correction (403)', async () => {
    const { emp1Token, emp2Token, emp1Id } = await setupSystemWithEmployee();

    // Employee 1 submits a correction request
    const correctionRes = await request(app)
      .post('/api/attendance/corrections')
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({
        date: '2025-03-10',
        requestedCheckIn: '2025-03-10T09:00:00.000Z',
        requestedCheckOut: '2025-03-10T17:00:00.000Z',
        reason: 'Forgot to punch out due to client meeting',
      });
    expect(correctionRes.status).toBe(201);
    const correctionId = correctionRes.body._id;

    // Employee 2 attempts to approve the correction -> 403
    const decideRes = await request(app)
      .patch(`/api/attendance/corrections/${correctionId}/decision`)
      .set('Authorization', `Bearer ${emp2Token}`)
      .send({ decision: 'approve' });
    expect(decideRes.status).toBe(403);
  });

  it('6. Timezone: 23:30 UTC previous day resolves to next calendar day in Asia/Karachi (UTC+5)', async () => {
    // 2025-04-10 at 23:30 UTC is 2025-04-11 04:30 in Asia/Karachi (+5)
    const utcDate = new Date('2025-04-10T23:30:00.000Z');
    const karachiDate = getKarachiDate(utcDate);
    expect(karachiDate).toBe('2025-04-11');
  });
});
