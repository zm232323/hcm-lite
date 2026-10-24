'use strict';
const { z } = require('zod');

const createAnnouncementSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters'),
  body: z.string().trim().min(1, 'Body is required'),
  pinned: z.boolean().optional().default(false),
});

const updateAnnouncementSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty').max(200, 'Title cannot exceed 200 characters').optional(),
  body: z.string().trim().min(1, 'Body cannot be empty').optional(),
  pinned: z.boolean().optional(),
});

module.exports = {
  createAnnouncementSchema,
  updateAnnouncementSchema,
};
