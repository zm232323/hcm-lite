'use strict';
const { z } = require('zod');

const chatSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(2000, 'Message cannot exceed 2000 characters'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'model']),
        content: z.string().max(2000),
      })
    )
    .max(6)
    .optional(),
});

const summarySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'From date must be YYYY-MM-DD').optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'To date must be YYYY-MM-DD').optional(),
  departmentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid department ID').optional(),
});

const smartLeaveSchema = z.object({
  text: z.string().trim().min(1, 'Please provide your leave description').max(500, 'Text cannot exceed 500 characters'),
});

const smartLeaveOutputSchema = z
  .object({
    type: z.string().trim().min(1, 'Leave type is required'),
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
    reason: z.string().trim().min(1, 'Reason is required'),
  })
  .refine((data) => data.start <= data.end, {
    message: 'Start date cannot be after end date',
    path: ['start'],
  });

module.exports = {
  chatSchema,
  summarySchema,
  smartLeaveSchema,
  smartLeaveOutputSchema,
};
