'use strict';
const crypto = require('crypto');
const { Employee, User, Department, Designation } = require('../../models');
const { hashPassword } = require('../../utils/password');
const { conflict, validation, notFound, forbidden } = require('../../utils/httpError');
const { logAction } = require('../../utils/audit');

// Registry for future modules (attendance, leave, payroll) to attach summaries
const summaryProviders = new Map();

function registerSummaryProvider(name, fn) {
  if (typeof fn === 'function') {
    summaryProviders.set(name, fn);
  }
}

/**
 * Register a new employee and create linked login account in ONE transaction/flow.
 */
async function createEmployee(data, actor) {
  const normalizedEmail = data.email.toLowerCase().trim();
  const normalizedCode = data.employeeCode.toUpperCase().trim();

  // 1. Uniqueness check for code and email
  const existingCode = await Employee.findOne({ employeeCode: normalizedCode });
  if (existingCode) {
    throw conflict(`Employee code '${normalizedCode}' is already in use`);
  }

  const existingEmpEmail = await Employee.findOne({ email: normalizedEmail });
  const existingUserEmail = await User.findOne({ email: normalizedEmail });
  if (existingEmpEmail || existingUserEmail) {
    throw conflict(`Email '${normalizedEmail}' is already registered`);
  }

  // 2. Validate department and designation exist and are active
  const department = await Department.findOne({ _id: data.departmentId, isActive: true });
  if (!department) {
    throw validation('Department not found or inactive', { departmentId: 'Invalid department' });
  }

  const designation = await Designation.findOne({ _id: data.designationId, isActive: true });
  if (!designation) {
    throw validation('Designation not found or inactive', { designationId: 'Invalid designation' });
  }

  // 3. Generate random temporary password
  const temporaryPassword = crypto.randomBytes(6).toString('hex'); // 12-char hex string
  const passwordHash = await hashPassword(temporaryPassword);

  // 4. Create User first
  const user = await User.create({
    name: data.name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: 'employee',
    isActive: true,
    mustChangePassword: true,
  });

  // 5. Create Employee and link to user, rolling back if failed
  let employee;
  try {
    employee = await Employee.create({
      employeeCode: normalizedCode,
      name: data.name.trim(),
      email: normalizedEmail,
      phone: data.phone || '',
      address: data.address || '',
      gender: data.gender || 'other',
      departmentId: department._id,
      designationId: designation._id,
      joiningDate: new Date(data.joiningDate),
      status: data.status || 'active',
      exitDate: null,
      basicSalary: Number(data.basicSalary),
      userId: user._id,
      createdBy: actor ? actor._id : null,
    });

    user.employeeId = employee._id;
    await user.save();
  } catch (err) {
    // Rollback user creation to prevent orphans
    await User.findByIdAndDelete(user._id);
    throw err;
  }

  // 6. Audit log
  await logAction({
    actor,
    action: 'CREATE_EMPLOYEE',
    entity: 'Employee',
    entityId: employee._id,
    after: {
      employeeCode: employee.employeeCode,
      name: employee.name,
      email: employee.email,
      departmentId: employee.departmentId,
      designationId: employee.designationId,
      status: employee.status,
    },
  });

  const populated = await Employee.findById(employee._id)
    .populate('departmentId', 'name code')
    .populate('designationId', 'title code');

  return {
    employee: populated,
    temporaryPassword,
  };
}

/**
 * Update an employee record (HR only).
 */
async function updateEmployee(id, data, actor) {
  const employee = await Employee.findById(id);
  if (!employee) {
    throw notFound('Employee not found');
  }

  if (data.departmentId) {
    const dept = await Department.findOne({ _id: data.departmentId, isActive: true });
    if (!dept) {
      throw validation('Department not found or inactive', { departmentId: 'Invalid department' });
    }
  }

  if (data.designationId) {
    const desig = await Designation.findOne({ _id: data.designationId, isActive: true });
    if (!desig) {
      throw validation('Designation not found or inactive', { designationId: 'Invalid designation' });
    }
  }

  const before = employee.toObject();

  // If status is updated to exited: require exitDate & deactivate login account
  if (data.status === 'exited') {
    const exitDate = data.exitDate ? new Date(data.exitDate) : new Date();
    employee.status = 'exited';
    employee.exitDate = exitDate;
    if (employee.userId) {
      await User.findByIdAndUpdate(employee.userId, { isActive: false });
    }
  } else if (data.status && data.status !== 'exited') {
    employee.status = data.status;
    employee.exitDate = null;
    if (employee.userId) {
      await User.findByIdAndUpdate(employee.userId, { isActive: true });
    }
  }

  if (data.name) employee.name = data.name.trim();
  if (data.phone !== undefined) employee.phone = data.phone.trim();
  if (data.address !== undefined) employee.address = data.address.trim();
  if (data.gender) employee.gender = data.gender;
  if (data.departmentId) employee.departmentId = data.departmentId;
  if (data.designationId) employee.designationId = data.designationId;
  if (data.joiningDate) employee.joiningDate = new Date(data.joiningDate);
  if (data.basicSalary !== undefined) employee.basicSalary = Number(data.basicSalary);

  await employee.save();

  await logAction({
    actor,
    action: 'UPDATE_EMPLOYEE',
    entity: 'Employee',
    entityId: employee._id,
    before: { status: before.status, departmentId: before.departmentId, basicSalary: before.basicSalary },
    after: { status: employee.status, departmentId: employee.departmentId, basicSalary: employee.basicSalary },
  });

  return Employee.findById(employee._id)
    .populate('departmentId', 'name code')
    .populate('designationId', 'title code');
}

/**
 * Employee updates own phone and address only.
 */
async function updateOwnProfile(employeeId, data, actor) {
  if (!employeeId) {
    throw notFound('Employee record not linked to account');
  }

  const employee = await Employee.findById(employeeId);
  if (!employee) {
    throw notFound('Employee profile not found');
  }

  const before = { phone: employee.phone, address: employee.address };

  if (data.phone !== undefined) employee.phone = data.phone.trim();
  if (data.address !== undefined) employee.address = data.address.trim();

  await employee.save();

  await logAction({
    actor,
    action: 'UPDATE_OWN_PROFILE',
    entity: 'Employee',
    entityId: employee._id,
    before,
    after: { phone: employee.phone, address: employee.address },
  });

  return Employee.findById(employee._id)
    .populate('departmentId', 'name code')
    .populate('designationId', 'title code');
}

/**
 * List / Directory of employees with search, filter, pagination, and role scoping.
 */
async function listEmployees(query, actor) {
  const filter = {};

  // Role scoping: Employee only gets their own record
  if (actor.role === 'employee') {
    if (!actor.employeeId) {
      return { employees: [], pagination: { total: 0, page: 1, limit: query.limit || 10, pages: 0 } };
    }
    filter._id = actor.employeeId;
  } else {
    // Admin / HR filters
    if (query.departmentId) filter.departmentId = query.departmentId;
    if (query.designationId) filter.designationId = query.designationId;
    if (query.status && query.status !== 'all') filter.status = query.status;

    if (query.q) {
      const escaped = query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ name: regex }, { email: regex }, { employeeCode: regex }];
    }
  }

  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;
  const sort = query.sort || '-createdAt';

  const [total, docs] = await Promise.all([
    Employee.countDocuments(filter),
    Employee.find(filter)
      .populate('departmentId', 'name code')
      .populate('designationId', 'title code')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  // Strip basicSalary for employees viewing other profiles (defensive measure)
  const isPrivileged = actor.role === 'admin' || actor.role === 'hr';
  const employees = docs.map((emp) => {
    const isSelf = actor.employeeId && emp._id.toString() === actor.employeeId.toString();
    if (!isPrivileged && !isSelf) {
      delete emp.basicSalary;
    }
    return emp;
  });

  return {
    employees,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Get employee 360 profile with summaries.
 */
async function getEmployeeById(id, actor) {
  if (actor.role === 'employee') {
    if (!actor.employeeId || actor.employeeId.toString() !== id.toString()) {
      throw forbidden('You do not have permission to view another employee profile');
    }
  }

  const employee = await Employee.findById(id)
    .populate('departmentId', 'name code')
    .populate('designationId', 'title code')
    .populate('userId', 'isActive email role lastLogin')
    .lean();

  if (!employee) {
    throw notFound('Employee not found');
  }

  // Strip basicSalary if not admin, HR, or self
  const isPrivileged = actor.role === 'admin' || actor.role === 'hr';
  const isSelf = actor.employeeId && employee._id.toString() === actor.employeeId.toString();
  if (!isPrivileged && !isSelf) {
    delete employee.basicSalary;
  }

  // Summary object with registry extensions
  const summary = {
    attendance: null,
    leave: null,
    payroll: null,
  };

  for (const [key, provider] of summaryProviders.entries()) {
    try {
      summary[key] = await provider(employee._id);
    } catch (err) {
      console.error(`[SummaryProvider] Failed for ${key}:`, err.message);
    }
  }

  return { employee, summary };
}

/**
 * Export matching employees as CSV string.
 */
async function exportEmployeesCsv(query) {
  const filter = {};
  if (query.departmentId) filter.departmentId = query.departmentId;
  if (query.designationId) filter.designationId = query.designationId;
  if (query.status && query.status !== 'all') filter.status = query.status;

  if (query.q) {
    const escaped = query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    filter.$or = [{ name: regex }, { email: regex }, { employeeCode: regex }];
  }

  const employees = await Employee.find(filter)
    .populate('departmentId', 'name')
    .populate('designationId', 'title')
    .sort({ employeeCode: 1 })
    .lean();

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headers = [
    'Employee Code',
    'Name',
    'Email',
    'Department',
    'Designation',
    'Status',
    'Joining Date',
    'Basic Salary',
  ];

  const rows = employees.map((emp) => [
    escapeCsv(emp.employeeCode),
    escapeCsv(emp.name),
    escapeCsv(emp.email),
    escapeCsv(emp.departmentId?.name || '—'),
    escapeCsv(emp.designationId?.title || '—'),
    escapeCsv(emp.status),
    escapeCsv(emp.joiningDate ? new Date(emp.joiningDate).toISOString().split('T')[0] : '—'),
    escapeCsv(emp.basicSalary),
  ]);

  return [headers.map(escapeCsv).join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

/**
 * Reusable helper: get employee by userId.
 */
async function getEmployeeByUserId(userId) {
  return Employee.findOne({ userId })
    .populate('departmentId', 'name code')
    .populate('designationId', 'title code');
}

/**
 * Reusable helper: count by status.
 */
async function countByStatus() {
  const counts = await Employee.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const result = { active: 0, probation: 0, exited: 0, total: 0 };
  for (const c of counts) {
    if (result[c._id] !== undefined) result[c._id] = c.count;
    result.total += c.count;
  }
  return result;
}

/**
 * CSV Import with Dry-Run support (Stretch Feature).
 */
async function importEmployeesCsv(records, { dryRun = false }, actor) {
  const departments = await Department.find({ isActive: true }).lean();
  const designations = await Designation.find({ isActive: true }).lean();

  const deptMapByName = new Map(departments.map((d) => [d.name.toLowerCase().trim(), d._id]));
  const desigMapByTitle = new Map(designations.map((d) => [d.title.toLowerCase().trim(), d._id]));

  const errors = [];
  const validRows = [];

  for (let i = 0; i < records.length; i++) {
    const rowNum = i + 1;
    const r = records[i];

    if (!r.code || !r.name || !r.email || !r.department || !r.designation || !r.joiningDate || !r.salary) {
      errors.push({ row: rowNum, field: 'general', reason: 'Missing one or more required columns' });
      continue;
    }

    const email = r.email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ row: rowNum, field: 'email', reason: 'Invalid email format' });
      continue;
    }

    const deptId = deptMapByName.get(r.department.toLowerCase().trim());
    if (!deptId) {
      errors.push({ row: rowNum, field: 'department', reason: `Unknown or inactive department '${r.department}'` });
      continue;
    }

    const desigId = desigMapByTitle.get(r.designation.toLowerCase().trim());
    if (!desigId) {
      errors.push({ row: rowNum, field: 'designation', reason: `Unknown or inactive designation '${r.designation}'` });
      continue;
    }

    if (isNaN(Date.parse(r.joiningDate))) {
      errors.push({ row: rowNum, field: 'joiningDate', reason: 'Invalid date format' });
      continue;
    }

    const salary = Number(r.salary);
    if (isNaN(salary) || salary <= 0) {
      errors.push({ row: rowNum, field: 'salary', reason: 'Salary must be greater than 0' });
      continue;
    }

    validRows.push({
      employeeCode: r.code.toUpperCase().trim(),
      name: r.name.trim(),
      email,
      phone: r.phone || '',
      address: r.address || '',
      gender: ['male', 'female', 'other'].includes((r.gender || '').toLowerCase())
        ? r.gender.toLowerCase()
        : 'other',
      departmentId: deptId,
      designationId: desigId,
      joiningDate: new Date(r.joiningDate).toISOString(),
      status: ['active', 'probation'].includes((r.status || '').toLowerCase()) ? r.status.toLowerCase() : 'active',
      basicSalary: salary,
    });
  }

  if (dryRun) {
    return {
      dryRun: true,
      summary: {
        totalRows: records.length,
        validRows: validRows.length,
        invalidRows: errors.length,
      },
      errors,
    };
  }

  // Non-dry-run: register valid rows
  const created = [];
  for (const item of validRows) {
    try {
      const res = await createEmployee(item, actor);
      created.push({
        employeeCode: res.employee.employeeCode,
        name: res.employee.name,
        email: res.employee.email,
        temporaryPassword: res.temporaryPassword,
      });
    } catch (err) {
      errors.push({ row: item.employeeCode, field: 'general', reason: err.message });
    }
  }

  return {
    dryRun: false,
    summary: {
      totalRows: records.length,
      createdCount: created.length,
      failedCount: errors.length,
    },
    created,
    errors,
  };
}

/**
 * Update basic salary for an employee and write audit log (Part 4 allowed addition).
 */
async function updateBasicSalary(employeeId, basic, actor) {
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    throw notFound('Employee not found');
  }
  const before = { basicSalary: employee.basicSalary };
  employee.basicSalary = Number(basic);
  await employee.save();

  await logAction({
    actor,
    action: 'UPDATE_BASIC_SALARY',
    entity: 'Employee',
    entityId: employee._id,
    before,
    after: { basicSalary: employee.basicSalary },
  });

  return employee;
}

module.exports = {
  createEmployee,
  updateEmployee,
  updateOwnProfile,
  listEmployees,
  getEmployeeById,
  exportEmployeesCsv,
  getEmployeeByUserId,
  countByStatus,
  registerSummaryProvider,
  importEmployeesCsv,
  updateBasicSalary,
};

