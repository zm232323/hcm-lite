'use strict';
const { calculateAnnualTax, calculateMonthlyTax } = require('../modules/payroll/tax');

describe('Tax Engine Unit Tests (Illustrative Slabs)', () => {
  test('Annual tax for income up to 600,000 is 0', () => {
    expect(calculateAnnualTax(0)).toBe(0);
    expect(calculateAnnualTax(300000)).toBe(0);
    expect(calculateAnnualTax(600000)).toBe(0);
  });

  test('Annual tax for 700,000 is 5,000 (5% on excess of 600k)', () => {
    expect(calculateAnnualTax(700000)).toBe(5000);
  });

  test('Annual tax for 1,200,000 is 30,000 (5% on 600k)', () => {
    expect(calculateAnnualTax(1200000)).toBe(30000);
  });

  test('Annual tax for 1,800,000 is 120,000 (30,000 + 15% on 600k)', () => {
    expect(calculateAnnualTax(1800000)).toBe(120000);
  });

  test('Annual tax for 2,400,000 is 210,000 (30,000 + 15% on 1.2M)', () => {
    expect(calculateAnnualTax(2400000)).toBe(210000);
  });

  test('Annual tax for 3,600,000 is 510,000 (210,000 + 25% on 1.2M)', () => {
    expect(calculateAnnualTax(3600000)).toBe(510000);
  });

  test('Annual tax for 4,800,000 is 930,000 (510,000 + 35% on 1.2M)', () => {
    expect(calculateAnnualTax(4800000)).toBe(930000);
  });

  test('Monthly tax calculation: full month vs prorated', () => {
    // Gross 150,000 -> Annual 1,800,000 -> Annual Tax 120,000 -> Base Monthly Tax 10,000
    const fullMonthTax = calculateMonthlyTax(150000, 22, 22);
    expect(fullMonthTax).toBe(10000);

    // Prorated 11 out of 22 days -> 5,000
    const halfMonthTax = calculateMonthlyTax(150000, 11, 22);
    expect(halfMonthTax).toBe(5000);

    // Zero eligible or working days returns 0
    expect(calculateMonthlyTax(150000, 0, 22)).toBe(0);
    expect(calculateMonthlyTax(150000, 10, 0)).toBe(0);
  });
});
