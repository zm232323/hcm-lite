'use strict';

const TIMEZONE = 'Asia/Karachi';

/**
 * Returns date formatted as "YYYY-MM-DD" in Asia/Karachi
 * @param {Date|string|number} [date=new Date()]
 * @returns {string}
 */
function getKarachiDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
}

/**
 * Returns time formatted as { hours, minutes, timeStr: "HH:mm" } in Asia/Karachi
 * @param {Date|string|number} [date=new Date()]
 * @returns {{ hours: number, minutes: number, timeStr: string }}
 */
function getKarachiTime(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const timeStr = formatter.format(d);
  const [hours, minutes] = timeStr.split(':').map((n) => parseInt(n, 10));
  return { hours, minutes, timeStr };
}

/**
 * Returns current timestamp and breakdown in Asia/Karachi
 */
function getKarachiNow() {
  const now = new Date();
  const todayStr = getKarachiDate(now);
  const { hours, minutes, timeStr } = getKarachiTime(now);

  // Day of week in Asia/Karachi (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    weekday: 'narrow',
  });
  // Use day of week calculation via Date parsed in UTC matching the Karachi date
  const [y, m, d] = todayStr.split('-').map(Number);
  const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();

  return {
    now,
    todayStr,
    timeStr,
    hours,
    minutes,
    dayOfWeek,
  };
}

/**
 * Checks if a given YYYY-MM-DD date falls on a weekend
 * @param {string} dateStr "YYYY-MM-DD"
 * @param {number[]} [weekendDays=[0, 6]] 0 = Sunday, 6 = Saturday
 * @returns {boolean}
 */
function isWeekend(dateStr, weekendDays = [0, 6]) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return weekendDays.includes(dayOfWeek);
}

/**
 * Returns day of week number (0=Sun, 6=Sat) for a "YYYY-MM-DD" string
 */
function getDayOfWeek(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * Generates an array of all "YYYY-MM-DD" dates in a month "YYYY-MM"
 * @param {string} yearMonth e.g. "2025-05"
 * @returns {string[]}
 */
function getDaysInMonth(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const dayStr = String(i).padStart(2, '0');
    const monthStr = String(month).padStart(2, '0');
    days.push(`${year}-${monthStr}-${dayStr}`);
  }
  return days;
}

/**
 * Generates array of "YYYY-MM-DD" dates between startDate and endDate inclusive
 */
function getDateRange(startDate, endDate) {
  const dates = [];
  let curr = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');
  while (curr <= end) {
    dates.push(curr.toISOString().split('T')[0]);
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return dates;
}

module.exports = {
  TIMEZONE,
  getKarachiDate,
  getKarachiTime,
  getKarachiNow,
  isWeekend,
  getDayOfWeek,
  getDaysInMonth,
  getDateRange,
};
