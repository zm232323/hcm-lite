'use strict';
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const { setup, teardown, clearDB } = require('./testHelpers');
const { User, Employee, Department, Designation } = require('../models');

beforeAll(async () => {
  await setup();
});

afterAll(async () => {
  await teardown();
});

afterEach(async () => {
  await clearDB();
});

/**
 * Helper to bootstrap system with Admin, HR, Department, and Designation
 */
async function setupOrgAndHr() {
  await request(app).post('/api/setup').send({
    companyName: 'Acme Corp',
    adminName: 'Super Admin',
    adminEmail: 'admin@acme.com',
    adminPassword: 'Password123!',
  });

  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@acme.com', password: 'Password123!' });
  const adminToken = adminLogin.body.token;

  // Create HR
  const hrRes = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'HR Manager', email: 'hr@acme.com' });
  const hrTempPassword = hrRes.body.tempPassword;

  // Login HR and change password
  const hrTempLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'hr@acme.com', password: hrTempPassword });
  await request(app)
    .post('/api/auth/change-password')
    .set('Authorization', `Bearer ${hrTempLogin.body.token}`)
    .send({ newPassword: 'HrPassword123!' });

  const hrFinalLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'hr@acme.com', password: 'HrPassword123!' });
  const hrToken = hrFinalLogin.body.token;

  // Create Department & Designation
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

  return { adminToken, hrToken, departmentId, designationId };
}

describe('Employees Module', () => {
  // 1. Registration creates employee and login together
  it('1. Registration creates employee and login together', async () => {
    const { hrToken, departmentId, designationId } = await setupOrgAndHr();

    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        employeeCode: 'EMP001',
        name: 'Alice Smith',
        email: 'alice@acme.com',
        phone: '+1234567890',
        address: '123 Tech Lane',
        gender: 'female',
        departmentId,
        designationId,
        joiningDate: '2025-01-15T00:00:00.000Z',
        status: 'active',
        basicSalary: 85000,
      });

    expect(res.status).toBe(201);
    expect(res.body.employee).toBeDefined();
    expect(res.body.employee.employeeCode).toBe('EMP001');
    expect(res.body.temporaryPassword).toBeDefined();

    // Verify linked login account was created and can log in
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'alice@acme.com',
      password: res.body.temporaryPassword,
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
    expect(loginRes.body.user.role).toBe('employee');
    expect(loginRes.body.user.mustChangePassword).toBe(true);
    expect(loginRes.body.user.employeeId).toBe(res.body.employee._id);
  });

  // 2. Duplicate email or code returns 409
  it('2. Duplicate email or code returns 409', async () => {
    const { hrToken, departmentId, designationId } = await setupOrgAndHr();

    // Register first employee
    await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        employeeCode: 'EMP001',
        name: 'Alice Smith',
        email: 'alice@acme.com',
        departmentId,
        designationId,
        joiningDate: '2025-01-15',
        basicSalary: 80000,
      });

    // Attempt duplicate code
    const dupCodeRes = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        employeeCode: 'EMP001',
        name: 'Bob Jones',
        email: 'bob@acme.com',
        departmentId,
        designationId,
        joiningDate: '2025-01-15',
        basicSalary: 75000,
      });
    expect(dupCodeRes.status).toBe(409);

    // Attempt duplicate email
    const dupEmailRes = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        employeeCode: 'EMP002',
        name: 'Another Alice',
        email: 'alice@acme.com',
        departmentId,
        designationId,
        joiningDate: '2025-01-15',
        basicSalary: 75000,
      });
    expect(dupEmailRes.status).toBe(409);
  });

  // 3. Unknown department returns 422
  it('3. Unknown department returns 422', async () => {
    const { hrToken, designationId } = await setupOrgAndHr();
    const fakeDeptId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        employeeCode: 'EMP001',
        name: 'Charlie Brown',
        email: 'charlie@acme.com',
        departmentId: fakeDeptId,
        designationId,
        joiningDate: '2025-01-15',
        basicSalary: 70000,
      });

    expect(res.status).toBe(422);
  });

  // 4. Employee cannot read another employee (403)
  it('4. Employee cannot read another employee (403)', async () => {
    const { hrToken, departmentId, designationId } = await setupOrgAndHr();

    // Register Employee 1
    const emp1Res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        employeeCode: 'EMP001',
        name: 'Employee One',
        email: 'emp1@acme.com',
        departmentId,
        designationId,
        joiningDate: '2025-01-15',
        basicSalary: 60000,
      });

    // Register Employee 2
    const emp2Res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        employeeCode: 'EMP002',
        name: 'Employee Two',
        email: 'emp2@acme.com',
        departmentId,
        designationId,
        joiningDate: '2025-01-15',
        basicSalary: 65000,
      });

    // Login as Employee 1
    const emp1Login = await request(app).post('/api/auth/login').send({
      email: 'emp1@acme.com',
      password: emp1Res.body.temporaryPassword,
    });
    const emp1Token = emp1Login.body.token;

    // Employee 1 can read own profile
    const ownRes = await request(app)
      .get(`/api/employees/${emp1Res.body.employee._id}`)
      .set('Authorization', `Bearer ${emp1Token}`);
    expect(ownRes.status).toBe(200);

    // Employee 1 attempts to read Employee 2 profile -> 403
    const otherRes = await request(app)
      .get(`/api/employees/${emp2Res.body.employee._id}`)
      .set('Authorization', `Bearer ${emp1Token}`);
    expect(otherRes.status).toBe(403);
  });

  // 5. Employee directory scoping and salary visibility
  it('5. Employee calling list receives only own record and salary is protected', async () => {
    const { hrToken, departmentId, designationId } = await setupOrgAndHr();

    // Register 2 employees
    const emp1Res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        employeeCode: 'EMP001',
        name: 'Dave',
        email: 'dave@acme.com',
        departmentId,
        designationId,
        joiningDate: '2025-01-15',
        basicSalary: 60000,
      });

    await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        employeeCode: 'EMP002',
        name: 'Eve',
        email: 'eve@acme.com',
        departmentId,
        designationId,
        joiningDate: '2025-01-15',
        basicSalary: 70000,
      });

    // HR sees both
    const hrList = await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${hrToken}`);
    expect(hrList.status).toBe(200);
    expect(hrList.body.employees.length).toBe(2);

    // Employee 1 logs in
    const emp1Login = await request(app).post('/api/auth/login').send({
      email: 'dave@acme.com',
      password: emp1Res.body.temporaryPassword,
    });

    // Employee calling directory gets ONLY own row
    const empList = await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${emp1Login.body.token}`);
    expect(empList.status).toBe(200);
    expect(empList.body.employees.length).toBe(1);
    expect(empList.body.employees[0].employeeCode).toBe('EMP001');
    expect(empList.body.employees[0].basicSalary).toBe(60000);
  });

  // 6. PATCH /me rejects fields other than phone and address
  it('6. PATCH /me rejects fields other than phone and address with 422', async () => {
    const { hrToken, departmentId, designationId } = await setupOrgAndHr();

    const empRes = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        employeeCode: 'EMP001',
        name: 'Frank',
        email: 'frank@acme.com',
        departmentId,
        designationId,
        joiningDate: '2025-01-15',
        basicSalary: 55000,
      });

    const empLogin = await request(app).post('/api/auth/login').send({
      email: 'frank@acme.com',
      password: empRes.body.temporaryPassword,
    });
    const token = empLogin.body.token;

    // Attempting to change salary -> 422
    const failRes = await request(app)
      .patch('/api/employees/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ basicSalary: 100000 });
    expect(failRes.status).toBe(422);

    // Attempting to change name -> 422
    const failNameRes = await request(app)
      .patch('/api/employees/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Hacked Name' });
    expect(failNameRes.status).toBe(422);

    // Changing phone and address succeeds -> 200
    const okRes = await request(app)
      .patch('/api/employees/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '+9876543210', address: '456 New Blvd' });
    expect(okRes.status).toBe(200);
    expect(okRes.body.phone).toBe('+9876543210');
    expect(okRes.body.address).toBe('456 New Blvd');
  });

  // 7. Exited employee cannot log in
  it('7. Exited employee cannot log in', async () => {
    const { hrToken, departmentId, designationId } = await setupOrgAndHr();

    const empRes = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        employeeCode: 'EMP001',
        name: 'Grace',
        email: 'grace@acme.com',
        departmentId,
        designationId,
        joiningDate: '2025-01-15',
        basicSalary: 62000,
      });

    const tempPassword = empRes.body.temporaryPassword;
    const employeeId = empRes.body.employee._id;

    // Login works before exiting
    const initialLogin = await request(app).post('/api/auth/login').send({
      email: 'grace@acme.com',
      password: tempPassword,
    });
    expect(initialLogin.status).toBe(200);

    // HR updates status to exited with exitDate
    const updateRes = await request(app)
      .put(`/api/employees/${employeeId}`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        status: 'exited',
        exitDate: '2025-06-01T00:00:00.000Z',
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.status).toBe('exited');

    // Login fails now
    const exitedLogin = await request(app).post('/api/auth/login').send({
      email: 'grace@acme.com',
      password: tempPassword,
    });
    expect(exitedLogin.status).toBe(401);
  });

  // 8. Failed registration leaves no orphan User
  it('8. Failed registration leaves no orphan User', async () => {
    const { hrToken } = await setupOrgAndHr();
    const fakeDeptId = new mongoose.Types.ObjectId().toString();
    const fakeDesigId = new mongoose.Types.ObjectId().toString();

    const initialUsersCount = await User.countDocuments();

    // Trigger failure with invalid department
    const failRes = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        employeeCode: 'EMP999',
        name: 'Orphan Candidate',
        email: 'orphan@acme.com',
        departmentId: fakeDeptId,
        designationId: fakeDesigId,
        joiningDate: '2025-01-15',
        basicSalary: 50000,
      });

    expect(failRes.status).toBe(422);

    const finalUsersCount = await User.countDocuments();
    expect(finalUsersCount).toBe(initialUsersCount);

    const orphanUser = await User.findOne({ email: 'orphan@acme.com' });
    expect(orphanUser).toBeNull();
  });

  // 9. CSV Export (HR only)
  it('9. CSV Export returns valid CSV string with correct headers', async () => {
    const { hrToken, departmentId, designationId } = await setupOrgAndHr();

    await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        employeeCode: 'EMP001',
        name: 'Henry, "Hank" Ford',
        email: 'henry@acme.com',
        departmentId,
        designationId,
        joiningDate: '2025-01-15',
        basicSalary: 90000,
      });

    const res = await request(app)
      .get('/api/employees/export')
      .set('Authorization', `Bearer ${hrToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('"Employee Code"');
    expect(res.text).toContain('"EMP001"');
    expect(res.text).toContain('"Henry, ""Hank"" Ford"');
  });
});
