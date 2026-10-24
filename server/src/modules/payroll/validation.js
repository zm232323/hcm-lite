'use strict';
const { z } = require('zod');
const { getKarachiNow } = require('../../utils/time');

const updateSalaryStructureSchema = z.object({
  basic: z.coerce.number({ invalid_type_error: 'Basic salary must be a number' }).positive('Basic salary must be greater than 0'),
  hraPercent: z.coerce.number().min(0, 'HRA percentage must be at least 0').max(100, 'HRA percentage cannot exceed 100').default(40),
  medicalPercent: z.coerce.number().min(0, 'Medical percentage must be at least 0').max(100, 'Medical percentage cannot exceed 100').default(10),
  otherAllowance: z.coerce.number().min(0, 'Other allowance cannot be negative').default(0),
});

const createPayrollRunSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format')
    .refine(
      (val) => {
        const { todayStr } = getKarachiNow();
        const currentMonth = todayStr.slice(0, 7);
        return val <= currentMonth;
      },
      {
        message: 'Payroll run cannot be created for a future month',
      }
    ),
});

module.exports = {
  updateSalaryStructureSchema,
  createPayrollRunSchema,
};
