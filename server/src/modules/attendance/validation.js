'use strict';
const { z } = require('zod');

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const monthRegex = /^\d{4}-\d{2}$/;

const correctionRequestSchema = z
  .object({
    date: z.string().regex(dateRegex, 'Date must be in YYYY-MM-DD format'),
    requestedCheckIn: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid check-in time'),
    requestedCheckOut: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid check-out time'),
    reason: z.string().trim().min(1, 'Reason for correction is required'),
  })
  .refine((data) => new Date(data.requestedCheckIn) < new Date(data.requestedCheckOut), {
    message: 'Check-out time must be after check-in time',
    path: ['requestedCheckOut'],
  });

const correctionDecisionSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  comment: z.string().trim().optional(),
});

const boardQuerySchema = z.object({
  date: z.string().regex(dateRegex).optional(),
  departmentId: z.string().optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const myAttendanceQuerySchema = z.object({
  month: z.string().regex(monthRegex, 'Month must be in YYYY-MM format').optional(),
});

module.exports = {
  correctionRequestSchema,
  correctionDecisionSchema,
  boardQuerySchema,
  myAttendanceQuerySchema,
};
