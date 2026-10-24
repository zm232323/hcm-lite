'use strict';
const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const isObjectId = (val) => objectIdRegex.test(val);

const createEmployeeSchema = z.object({
  employeeCode: z.string().trim().min(1, 'Employee code is required'),
  name: z.string().trim().min(1, 'Full name is required'),
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  phone: z.string().trim().optional().default(''),
  address: z.string().trim().optional().default(''),
  gender: z.enum(['male', 'female', 'other']).optional().default('other'),
  departmentId: z.string().refine(isObjectId, 'Invalid department ID'),
  designationId: z.string().refine(isObjectId, 'Invalid designation ID'),
  joiningDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Joining date must be a valid ISO date string'),
  status: z.enum(['active', 'probation']).optional().default('active'),
  basicSalary: z.coerce.number().positive('Basic salary must be greater than 0'),
});

const updateEmployeeSchema = z
  .object({
    name: z.string().trim().min(1, 'Name cannot be empty').optional(),
    phone: z.string().trim().optional(),
    address: z.string().trim().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    departmentId: z.string().refine(isObjectId, 'Invalid department ID').optional(),
    designationId: z.string().refine(isObjectId, 'Invalid designation ID').optional(),
    joiningDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), 'Invalid joining date')
      .optional(),
    status: z.enum(['active', 'probation', 'exited']).optional(),
    exitDate: z
      .string()
      .nullable()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), 'Exit date must be a valid date'),
    basicSalary: z.coerce.number().positive('Basic salary must be greater than 0').optional(),
  })
  .refine(
    (data) => {
      if (data.status === 'exited' && !data.exitDate) {
        return false;
      }
      return true;
    },
    {
      message: 'Exit date is required when status is set to exited',
      path: ['exitDate'],
    }
  );

// Employee own profile edit: strictly allows ONLY phone and address
const ownProfileSchema = z
  .object({
    phone: z.string().trim().optional(),
    address: z.string().trim().optional(),
  })
  .strict();

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  q: z.string().trim().optional(),
  departmentId: z.string().optional(),
  designationId: z.string().optional(),
  status: z.enum(['active', 'probation', 'exited', 'all']).optional(),
  sort: z.string().optional().default('-createdAt'),
});

module.exports = {
  createEmployeeSchema,
  updateEmployeeSchema,
  ownProfileSchema,
  listQuerySchema,
};
