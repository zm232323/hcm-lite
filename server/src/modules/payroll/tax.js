'use strict';

/**
 * Pure function to calculate annual tax based on illustrative income slabs.
 * Slabs on annual gross (PKR):
 * - Up to 600,000: 0
 * - 600,001 to 1,200,000: 5% of excess over 600,000
 * - 1,200,001 to 2,400,000: 30,000 + 15% of excess over 1,200,000
 * - 2,400,001 to 3,600,000: 210,000 + 25% of excess over 2,400,000
 * - Above 3,600,000: 510,000 + 35% of excess over 3,600,000
 *
 * @param {number} annualGross
 * @returns {number}
 */
function calculateAnnualTax(annualGross) {
  const income = Math.max(0, Number(annualGross) || 0);

  if (income <= 600000) {
    return 0;
  }
  if (income <= 1200000) {
    return round2((income - 600000) * 0.05);
  }
  if (income <= 2400000) {
    return round2(30000 + (income - 1200000) * 0.15);
  }
  if (income <= 3600000) {
    return round2(210000 + (income - 2400000) * 0.25);
  }
  return round2(510000 + (income - 3600000) * 0.35);
}

/**
 * Calculate monthly tax based on monthly gross, prorated by eligibleDays / workingDays.
 *
 * @param {number} monthlyGross
 * @param {number} eligibleDays
 * @param {number} workingDays
 * @returns {number}
 */
function calculateMonthlyTax(monthlyGross, eligibleDays, workingDays) {
  if (!workingDays || workingDays <= 0 || !eligibleDays || eligibleDays <= 0) {
    return 0;
  }
  const annualGross = Number(monthlyGross) * 12;
  const annualTax = calculateAnnualTax(annualGross);
  const baseMonthlyTax = annualTax / 12;
  const proratedTax = baseMonthlyTax * (eligibleDays / workingDays);
  return round2(proratedTax);
}

/**
 * Standard 2-decimal rounding.
 */
function round2(val) {
  return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
}

module.exports = {
  calculateAnnualTax,
  calculateMonthlyTax,
  round2,
};
