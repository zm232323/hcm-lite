'use strict';
const { z } = require('zod');
const { getKarachiNow } = require('../../utils/time');

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const isObjectId = (val) => /^[0-9a-fA-F]{24}$/.test(val);

const dashboardQuerySchema = z
  .object({
    from: z.string().regex(dateRegex, 'From date must be in YYYY-MM-DD format').optional(),
    to: z.string().regex(dateRegex, 'To date must be in YYYY-MM-DD format').optional(),
    departmentId: z.string().refine(isObjectId, 'Invalid department ID').optional(),
  })
  .refine(
    (data) => {
      const nowInfo = getKarachiNow();
      const from = data.from || `${nowInfo.todayStr.slice(0, 7)}-01`;
      const to = data.to || nowInfo.todayStr;
      return from <= to;
    },
    {
      message: 'From date cannot be after to date',
      path: ['from'],
    }
  );

module.exports = {
  dashboardQuerySchema,
};
