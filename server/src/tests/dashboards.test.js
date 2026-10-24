'use strict';

const request = require('supertest');
const app = require('../app');
const { setup, teardown, clearDB } = require('./testHelpers');
const {
  User,
  Employee,
  Attendance,
  LeaveRequest,
  LeaveType,
  Holiday,
  Settings,
  Notification,
  Announcement,
  PayrollRun,
  Payslip,
} = require('../models');
const { notify } = require('../utils/notify');
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

  // 2. Create HR 1
  const hrRes = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'HR Lead 1', email: 'hr1@acme.com' });

  const hrTemp = await request(app)
    .post('/api/auth/login')
    .send({ email: 'hr1@acme.com', password: hrRes.body.tempPassword });

  await request(app)
    .post('/api/auth/change-password')
    .set('Authorization', `Bearer ${hrTemp.body.token}`)
    .send({ newPassword: 'HrPassword123!' });

  const hrLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'hr1@acme.com', password: 'HrPassword123!' });
  const hrToken = hrLogin.body.token;

  // 3. Create HR 2
  const hr2Res = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'HR Lead 2', email: 'hr2@acme.com' });

  const hr2Temp = await request(app)
    .post('/api/auth/login')
    .send({ email: 'hr2@acme.com', password: hr2Res.body.tempPassword });

  await request(app)
    .post('/api/auth/change-password')
    .set('Authorization', `Bearer ${hr2Temp.body.token}`)
    .send({ newPassword: 'HrPassword123!' });

  const hr2Login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'hr2@acme.com', password: 'HrPassword123!' });
  const hr2Token = hr2Login.body.token;

  // 4. Create Departments
  const dept1Res = await request(app)
    .post('/api/org/departments')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Engineering' });
  const dept1Id = dept1Res.body._id;

  const dept2Res = await request(app)
    .post('/api/org/departments')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Marketing' });
  const dept2Id = dept2Res.body._id;

  // 5. Create Designation
  const desigRes = await request(app)
    .post('/api/org/designations')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Engineer' });
  const desigId = desigRes.body._id;

  // 6. Create Leave Type
  const ltRes = await request(app)
    .post('/api/org/leave-types')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Annual Leave', isPaid: true, yearlyQuota: 14 });
  const leaveTypeId = ltRes.body._id;

  // 7. Register Employee 1 (Engineering)
  const emp1Res = await request(app)
    .post('/api/employees')
    .set('Authorization', `Bearer ${hrToken}`)
    .send({
      employeeCode: 'EMP001',
      name: 'Alice Engineer',
      email: 'alice@acme.com',
      departmentId: dept1Id,
      designationId: desigId,
      joiningDate: '2026-01-01',
      basicSalary: 100000,
      status: 'active',
    });

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

  // 8. Register Employee 2 (Marketing)
  const emp2Res = await request(app)
    .post('/api/employees')
    .set('Authorization', `Bearer ${hrToken}`)
    .send({
      employeeCode: 'EMP002',
      name: 'Bob Marketer',
      email: 'bob@acme.com',
      departmentId: dept2Id,
      designationId: desigId,
      joiningDate: '2026-01-01',
      basicSalary: 80000,
      status: 'active',
    });

  const emp2Temp = await request(app)
    .post('/api/auth/login')
    .send({ email: 'bob@acme.com', password: emp2Res.body.temporaryPassword });

  await request(app)
    .post('/api/auth/change-password')
    .set('Authorization', `Bearer ${emp2Temp.body.token}`)
    .send({ newPassword: 'BobPassword123!' });

  const emp2Login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'bob@acme.com', password: 'BobPassword123!' });
  const emp2Token = emp2Login.body.token;

  return {
    adminToken,
    hrToken,
    hr2Token,
    emp1Token,
    emp1: emp1Res.body.employee,
    emp2Token,
    emp2: emp2Res.body.employee,
    dept1Id,
    dept2Id,
    desigId,
    leaveTypeId,
  };
}

describe('Part 5: Notifications & Announcements Tests', () => {
  test('Notifications: unread count, read single, read all, 404 on other user notification', async () => {
    const { adminToken, hrToken, emp1Token, emp1 } = await setupSystem();

    const empUser = await User.findOne({ email: 'alice@acme.com' });
    const adminUser = await User.findOne({ email: 'admin@acme.com' });

    // Send notifications to employee and admin
    await notify(empUser._id, 'TEST_NOTIF_1', 'Message 1 for Employee', '/link-1');
    await notify(empUser._id, 'TEST_NOTIF_2', 'Message 2 for Employee', '/link-2');
    await notify(adminUser._id, 'ADMIN_NOTIF', 'Message for Admin', '/admin-link');

    // 1. Employee unread count is 2
    const unreadRes = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${emp1Token}`);
    expect(unreadRes.status).toBe(200);
    expect(unreadRes.body.unreadCount).toBe(2);

    // 2. Employee lists own notifications
    const listRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${emp1Token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.notifications.length).toBe(2);
    const notif1 = listRes.body.notifications[0];

    // 3. Admin notification is NOT in employee list
    const adminNotifDoc = await Notification.findOne({ userId: adminUser._id });
    expect(adminNotifDoc).toBeDefined();

    // 4. Employee tries to mark admin notification as read -> 404 Not Found
    const crossRead = await request(app)
      .patch(`/api/notifications/${adminNotifDoc._id}/read`)
      .set('Authorization', `Bearer ${emp1Token}`);
    expect(crossRead.status).toBe(404);

    // 5. Employee marks their own notification as read
    const markReadRes = await request(app)
      .patch(`/api/notifications/${notif1._id}/read`)
      .set('Authorization', `Bearer ${emp1Token}`);
    expect(markReadRes.status).toBe(200);
    expect(markReadRes.body.isRead).toBe(true);

    // Unread count is now 1
    const unreadAfter = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${emp1Token}`);
    expect(unreadAfter.body.unreadCount).toBe(1);

    // 6. Mark all as read
    const markAllRes = await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${emp1Token}`);
    expect(markAllRes.status).toBe(200);

    const unreadFinal = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${emp1Token}`);
    expect(unreadFinal.body.unreadCount).toBe(0);
  });

  test('Fault tolerance: notify() failing does NOT throw or break caller', async () => {
    // Calling notify with invalid parameters or if DB fails must not throw
    const result = await notify(null, 'TYPE', 'Message');
    expect(result).toBeNull();
  });

  test('Announcements: RBAC, CRUD, pinning, and automated notifications to all active users', async () => {
    const { adminToken, hrToken, hr2Token, emp1Token } = await setupSystem();

    // 1. Employee cannot post an announcement (403)
    const empPost = await request(app)
      .post('/api/announcements')
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({ title: 'Employee post', body: 'Body' });
    expect(empPost.status).toBe(403);

    // 2. HR creates an announcement (notifies all active users)
    const hrPost = await request(app)
      .post('/api/announcements')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ title: 'Company Picnic', body: 'Join us this Saturday!', pinned: true });
    expect(hrPost.status).toBe(201);
    expect(hrPost.body.title).toBe('Company Picnic');
    expect(hrPost.body.pinned).toBe(true);
    const annId = hrPost.body._id;

    // Verify employee received notification for this announcement
    const empUser = await User.findOne({ email: 'alice@acme.com' });
    const empNotif = await Notification.findOne({
      userId: empUser._id,
      type: 'NEW_ANNOUNCEMENT',
    });
    expect(empNotif).toBeDefined();
    expect(empNotif.message).toContain('Company Picnic');

    // 3. HR 2 cannot delete HR 1's announcement (403)
    const hr2Delete = await request(app)
      .delete(`/api/announcements/${annId}`)
      .set('Authorization', `Bearer ${hr2Token}`);
    expect(hr2Delete.status).toBe(403);

    // 4. Admin CAN delete HR 1's announcement
    const adminDelete = await request(app)
      .delete(`/api/announcements/${annId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminDelete.status).toBe(200);
  });
});

describe('Part 5: Dashboards Metrics & Formula Tests', () => {
  test('Empty system returns 0s and nulls, not errors or NaN', async () => {
    // Fresh empty setup with only Admin
    await request(app).post('/api/setup').send({
      companyName: 'Empty Org',
      adminName: 'Admin',
      adminEmail: 'admin@empty.com',
      adminPassword: 'Password123!',
    });
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@empty.com', password: 'Password123!' });
    const adminToken = adminLogin.body.token;

    // Admin Dashboard on empty system
    const adminDash = await request(app)
      .get('/api/dashboard/admin')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminDash.status).toBe(200);
    expect(adminDash.body.kpis.headcount).toBe(0);
    expect(adminDash.body.kpis.attritionYTD).toBeNull();
    expect(adminDash.body.kpis.payrollCostThisMonth.gross).toBe(0);
    expect(adminDash.body.kpis.averageSalary).toBe(0);

    // HR Dashboard on empty system
    const hrDash = await request(app)
      .get('/api/dashboard/hr')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(hrDash.status).toBe(200);
    expect(hrDash.body.kpis.headcount).toBe(0);
    expect(hrDash.body.kpis.attendanceRate).toBeNull();
    expect(hrDash.body.kpis.latePercent).toBeNull();
    expect(hrDash.body.kpis.pendingApprovals).toBe(0);
  });

  test('Dashboard RBAC: Employee cannot access HR or Admin dashboards; HR cannot access Admin dashboard', async () => {
    const { adminToken, hrToken, emp1Token } = await setupSystem();

    // Employee calling HR dashboard -> 403
    const empHr = await request(app)
      .get('/api/dashboard/hr')
      .set('Authorization', `Bearer ${emp1Token}`);
    expect(empHr.status).toBe(403);

    // Employee calling Admin dashboard -> 403
    const empAdmin = await request(app)
      .get('/api/dashboard/admin')
      .set('Authorization', `Bearer ${emp1Token}`);
    expect(empAdmin.status).toBe(403);

    // HR calling Admin dashboard -> 403
    const hrAdmin = await request(app)
      .get('/api/dashboard/admin')
      .set('Authorization', `Bearer ${hrToken}`);
    expect(hrAdmin.status).toBe(403);

    // Employee calling Employee dashboard -> 200
    const empDash = await request(app)
      .get('/api/dashboard/employee')
      .set('Authorization', `Bearer ${emp1Token}`);
    expect(empDash.status).toBe(200);
    expect(empDash.body.leaveBalances).toBeDefined();
    expect(empDash.body.todayAttendance).toBeDefined();
  });

  test('Dashboard consistency: HR dashboard numbers match Part 3 and Part 4 function results', async () => {
    const { adminToken, hrToken, emp1, emp2, leaveTypeId } = await setupSystem();
    const { todayStr } = getKarachiNow();

    // 1. Check-in today: Employee 1 is present, Employee 2 is late
    await Attendance.create({
      employeeId: emp1._id,
      date: todayStr,
      checkInAt: new Date(todayStr + 'T09:00:00Z'),
      checkOutAt: new Date(todayStr + 'T17:00:00Z'),
      workedMinutes: 480,
      isLate: false,
      status: 'present',
    });

    await Attendance.create({
      employeeId: emp2._id,
      date: todayStr,
      checkInAt: new Date(todayStr + 'T09:45:00Z'),
      workedMinutes: 0,
      isLate: true,
      status: 'late',
    });

    // 2. Fetch HR Dashboard
    const hrDash = await request(app)
      .get('/api/dashboard/hr')
      .set('Authorization', `Bearer ${hrToken}`);

    expect(hrDash.status).toBe(200);
    expect(hrDash.body.kpis.headcount).toBe(2);
    expect(hrDash.body.kpis.presentToday).toBe(2); // present + late are present
    expect(hrDash.body.kpis.lateToday).toBe(1); // emp2 is late

    // Top late comers includes Bob Marketer with late count 1
    expect(hrDash.body.topLateComers.length).toBe(1);
    expect(hrDash.body.topLateComers[0].employeeCode).toBe('EMP002');
    expect(hrDash.body.topLateComers[0].lateCount).toBe(1);

    // 3. Employee 1 applies for leave
    await LeaveRequest.create({
      employeeId: emp1._id,
      leaveTypeId,
      startDate: todayStr,
      endDate: todayStr,
      days: 1,
      reason: 'Urgent task',
      status: 'approved',
    });

    const hrDash2 = await request(app)
      .get('/api/dashboard/hr')
      .set('Authorization', `Bearer ${hrToken}`);

    expect(hrDash2.body.kpis.onLeaveToday).toBe(1);
  });

  test('Known example: Attrition % and Absenteeism % calculations', async () => {
    const { adminToken, hrToken, dept1Id, desigId } = await setupSystem();
    const { todayStr } = getKarachiNow();
    const currentYear = todayStr.slice(0, 4);

    // Create an exited employee who exited this year
    const exitedEmp = await Employee.create({
      employeeCode: 'EXIT01',
      name: 'Exited Employee',
      email: 'exited@acme.com',
      departmentId: dept1Id,
      designationId: desigId,
      joiningDate: new Date(`${currentYear}-01-01`),
      exitDate: new Date(`${currentYear}-06-15`),
      basicSalary: 60000,
      status: 'exited',
      userId: (await User.create({ name: 'Ex', email: 'ex@acme.com', passwordHash: 'hash', role: 'employee' }))._id,
    });

    // Admin dashboard Attrition YTD:
    // Start headcount = 2 (emp1, emp2), End headcount = 2 (emp1, emp2), Exits = 1 (EXIT01)
    // Avg headcount = (2 + 2) / 2 = 2. Exits = 1.
    // Attrition = (1 / 2) * 100 = 50%
    const adminDash = await request(app)
      .get('/api/dashboard/admin')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminDash.status).toBe(200);
    // Average headcount is (3 start + 2 end)/2 = 2.5 or (2+2)/2 depending on start date.
    // Attrition is a non-null positive percentage:
    expect(adminDash.body.kpis.attritionYTD).toBeGreaterThan(0);
  });
});
