'use strict';
const { getSettings } = require('../settings/service');
const { LeaveType } = require('../../models');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Builds the dynamic policy text using live settings and active leave types.
 * @returns {Promise<string>}
 */
async function buildPolicyText() {
  let settings;
  try {
    settings = await getSettings();
  } catch (err) {
    settings = {
      workStartTime: '09:00',
      workEndTime: '18:00',
      gracePeriodMinutes: 15,
      halfDayThresholdHours: 5,
      weekendDays: [0, 6],
    };
  }

  let leaveTypes = [];
  try {
    leaveTypes = await LeaveType.find({ isActive: true }).lean();
  } catch (err) {
    leaveTypes = [];
  }

  const weekendNames = (settings.weekendDays || [0, 6]).map((d) => DAY_NAMES[d] || d).join(' and ');
  const workStart = settings.workStartTime || '09:00';
  const graceMinutes = settings.gracePeriodMinutes ?? 15;
  const halfDayHours = settings.halfDayThresholdHours ?? 5;

  const leaveQuotaLines =
    leaveTypes.length > 0
      ? leaveTypes
          .map((lt) => `- ${lt.name}: ${lt.yearlyQuota ?? 'Unlimited'} days/year (${lt.isPaid ? 'Paid' : 'Unpaid'})`)
          .join('\n')
      : '- Annual: 14 days/year (Paid)\n- Casual: 10 days/year (Paid)\n- Sick: 8 days/year (Paid)\n- Unpaid: Unlimited (Unpaid)';

  return `
COMPANY POLICIES & BUSINESS RULES:

1. WORK SCHEDULE & ATTENDANCE:
- Office Start Time: ${workStart}.
- Grace Period: ${graceMinutes} minutes. An employee is marked 'late' if check-in is after the grace period (e.g., after 09:${String(graceMinutes).padStart(2, '0')}).
- Half-Day: Marked when total worked time is under ${halfDayHours} hours on a working day.
- Weekend Days: ${weekendNames}. Attendance is only expected on working days (non-weekend, non-holiday).
- Daily Stamping: Exactly one attendance record per employee per day.
- Absent: An employee is absent on a past working day if there is no attendance record and no approved leave.
- Missing Checkout: Status when an employee checks in but does not check out before midnight.

2. LEAVE RULES:
- Working Days Only: Leave requests only count and deduct working days; weekends and official public holidays falling within the leave period are skipped and not charged against balance.
- Active Leave Types & Quotas:
${leaveQuotaLines}
- Leave Validation: Overlapping leave requests, requests with negative or zero days, or requests exceeding available remaining quota are automatically rejected.
- Status: Requests require HR or Admin approval.

3. PAYROLL & SALARY STRUCTURE:
- Salary Components: Gross Salary = Basic Salary + House Rent Allowance (HRA, 40% of Basic) + Medical Allowance (10% of Basic) + other allowances. In standard setups, Gross = 1.5 x Basic.
- Per-Day Rate: Per-Day Rate = Gross Salary / working days in the month.
- Deductions: Absent days, unpaid leave days, and half-days (deducted at 0.5 x per-day rate) inside the eligible period are deducted from earned gross.
- Joiners / Leavers Proration: Employees joining or leaving mid-month are prorated based on eligible working days.
- Tax Slabs (Annual Taxable Gross = Gross x 12):
  * Up to PKR 600,000: 0%
  * PKR 600,001 to 1,200,000: 5% of excess over 600,000
  * PKR 1,200,001 to 2,400,000: PKR 30,000 + 15% of excess over 1,200,000
  * PKR 2,400,001 to 3,600,000: PKR 210,000 + 25% of excess over 2,400,000
  * Above PKR 3,600,000: PKR 510,000 + 35% of excess over 3,600,000
  * Monthly tax is annual tax / 12 (prorated for partial service).
- Finalization: Only Admins can finalize payroll runs. Finalized runs and payslips are permanently locked and immutable.
`.trim();
}

module.exports = {
  buildPolicyText,
};
