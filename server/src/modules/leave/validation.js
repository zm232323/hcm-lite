'use strict';
const { z } = require('zod');

const isObjectId = (val) => /^[0-9a-fA-F]{24}$/.test(val);
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const applyLeaveSchema = z
  .object({
    leaveTypeId: z.string().refine(isObjectId, 'Invalid leave type ID'),
    startDate: z.string().regex(dateRegex, 'Start date must be in YYYY-MM-DD format'),
    endDate: z.string().regex(dateRegex, 'End date must be in YYYY-MM-DD format'),
    reason: z.string().trim().min(1, 'Reason is required'),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

const previewLeaveSchema = z
  .object({
    leaveTypeId: z.string().refine(isObjectId, 'Invalid leave type ID'),
    startDate: z.string().regex(dateRegex, 'Start date must be in YYYY-MM-DD format'),
    endDate: z.string().regex(dateRegex, 'End date must be in YYYY-MM-DD format'),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

const leaveDecisionSchema = z
  .object({
    decision: z.enum(['approve', 'reject']),
    comment: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (data.decision === 'reject' && (!data.comment || data.comment.trim().length === 0)) {
        return false;
      }
      return true;
    },
    {
      message: 'Comment is required when rejecting a leave request',
      path: ['comment'],
    }
  );

const listLeaveQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(['all', 'pending', 'approved', 'rejected', 'cancelled']).optional(),
  departmentId: z.string().optional(),
  employeeId: z.string().optional(),
  startDate: z.string().regex(dateRegex).optional(),
  endDate: z.string().regex(dateRegex).optional(),
});

module.exports = {
  applyLeaveSchema,
  previewLeaveSchema,
  leaveDecisionSchema,
  listLeaveQuerySchema,
};
