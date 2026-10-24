'use strict';
const PDFDocument = require('pdfkit');

/**
 * Format currency helper for PDF
 */
function formatPkr(amount) {
  const num = Number(amount) || 0;
  return 'PKR ' + num.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Generate payslip PDF stream on the fly.
 *
 * @param {Object} payslip - The payslip snapshot doc
 * @param {Object} run - The payroll run doc
 * @param {Object} settings - Organization settings
 * @param {import('stream').Writable} outputStream - Stream to pipe into (e.g. Express res)
 */
function streamPayslipPdf(payslip, run, settings, outputStream) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  doc.pipe(outputStream);

  const companyName = settings?.companyName || 'HCM Lite';
  const isDraft = run?.status === 'draft';

  // 1. Watermark for Draft
  if (isDraft) {
    doc.save();
    doc.rotate(-35, { origin: [300, 400] });
    doc.fontSize(60);
    doc.fillColor('#e5e7eb');
    doc.text('DRAFT', 140, 360);
    doc.restore();
  }

  // 2. Header
  doc.fontSize(20).fillColor('#111827').text(companyName, { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(14).fillColor('#4b5563').text(`SALARY PAYSLIP - ${payslip.month}`, { align: 'center' });
  
  if (isDraft) {
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor('#dc2626').text('** DRAFT RUN - FOR PREVIEW ONLY **', { align: 'center' });
  }

  doc.moveDown(1);
  doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(1);

  // 3. Employee & Run Details in 2 columns
  const col1Left = 45;
  const col2Left = 310;
  const topDetailsY = doc.y;

  doc.fontSize(10).fillColor('#374151');
  doc.font('Helvetica-Bold').text('Employee Name:', col1Left, topDetailsY);
  doc.font('Helvetica').text(payslip.employeeName || '—', col1Left + 105, topDetailsY);

  doc.font('Helvetica-Bold').text('Employee Code:', col1Left, topDetailsY + 18);
  doc.font('Helvetica').text(payslip.employeeCode || '—', col1Left + 105, topDetailsY + 18);

  doc.font('Helvetica-Bold').text('Department:', col1Left, topDetailsY + 36);
  doc.font('Helvetica').text(payslip.departmentName || '—', col1Left + 105, topDetailsY + 36);

  doc.font('Helvetica-Bold').text('Designation:', col1Left, topDetailsY + 54);
  doc.font('Helvetica').text(payslip.designationName || '—', col1Left + 105, topDetailsY + 54);

  // Column 2: Attendance / Days
  doc.font('Helvetica-Bold').text('Month Working Days:', col2Left, topDetailsY);
  doc.font('Helvetica').text(String(payslip.workingDays), col2Left + 130, topDetailsY);

  doc.font('Helvetica-Bold').text('Eligible Days:', col2Left, topDetailsY + 18);
  doc.font('Helvetica').text(String(payslip.eligibleDays), col2Left + 130, topDetailsY + 18);

  doc.font('Helvetica-Bold').text('Deduction Days:', col2Left, topDetailsY + 36);
  const deductionDaysDetails = `${payslip.deductionDays} (Abs: ${payslip.absentDays}, Unp: ${payslip.unpaidLeaveDays}, 1/2: ${payslip.halfDays})`;
  doc.font('Helvetica').text(deductionDaysDetails, col2Left + 130, topDetailsY + 36);

  doc.font('Helvetica-Bold').text('Daily Rate:', col2Left, topDetailsY + 54);
  doc.font('Helvetica').text(formatPkr(payslip.perDay), col2Left + 130, topDetailsY + 54);

  const afterDetailsY = topDetailsY + 80;
  doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(40, afterDetailsY).lineTo(555, afterDetailsY).stroke();

  // 4. Earnings & Deductions Tables
  const tableTopY = afterDetailsY + 15;

  // Headers
  doc.fillColor('#1f2937');
  doc.rect(40, tableTopY, 250, 22).fill('#f3f4f6');
  doc.rect(305, tableTopY, 250, 22).fill('#f3f4f6');

  doc.fillColor('#111827').font('Helvetica-Bold').fontSize(10);
  doc.text('EARNINGS', 50, tableTopY + 6);
  doc.text('AMOUNT (PKR)', 210, tableTopY + 6, { align: 'right', width: 70 });

  doc.text('DEDUCTIONS & TAX', 315, tableTopY + 6);
  doc.text('AMOUNT (PKR)', 475, tableTopY + 6, { align: 'right', width: 70 });

  let rowY = tableTopY + 28;
  doc.font('Helvetica').fontSize(9).fillColor('#374151');

  // Row 1: Basic & Attendance Deduction
  doc.text('Basic Salary', 50, rowY);
  doc.text(formatPkr(payslip.basic), 180, rowY, { align: 'right', width: 100 });
  doc.text(`Attendance/Leave Deductions`, 315, rowY);
  doc.text(formatPkr(payslip.deduction), 445, rowY, { align: 'right', width: 100 });

  // Row 2: HRA & Income Tax
  rowY += 20;
  doc.text(`House Rent Allowance (${payslip.hraPercent}%)`, 50, rowY);
  doc.text(formatPkr(payslip.hra), 180, rowY, { align: 'right', width: 100 });
  doc.text('Income Tax (Monthly)', 315, rowY);
  doc.text(formatPkr(payslip.tax), 445, rowY, { align: 'right', width: 100 });

  // Row 3: Medical
  rowY += 20;
  doc.text(`Medical Allowance (${payslip.medicalPercent}%)`, 50, rowY);
  doc.text(formatPkr(payslip.medical), 180, rowY, { align: 'right', width: 100 });

  // Row 4: Other Allowance
  rowY += 20;
  doc.text('Other Allowance', 50, rowY);
  doc.text(formatPkr(payslip.otherAllowance), 180, rowY, { align: 'right', width: 100 });

  // Row 5: Total Gross & Total Deductions
  rowY += 26;
  doc.strokeColor('#e5e7eb').lineWidth(0.5)
    .moveTo(40, rowY - 6).lineTo(290, rowY - 6).stroke()
    .moveTo(305, rowY - 6).lineTo(555, rowY - 6).stroke();

  doc.font('Helvetica-Bold').fillColor('#111827');
  doc.text('Total Monthly Gross:', 50, rowY);
  doc.text(formatPkr(payslip.gross), 180, rowY, { align: 'right', width: 100 });

  const totalDeductions = round2(payslip.deduction + payslip.tax);
  doc.text('Total Deductions:', 315, rowY);
  doc.text(formatPkr(totalDeductions), 445, rowY, { align: 'right', width: 100 });

  // Row 6: Earned / Prorated Gross if prorated
  if (payslip.eligibleDays !== payslip.workingDays) {
    rowY += 20;
    doc.font('Helvetica-Oblique').fillColor('#4b5563');
    doc.text(`Earned Gross (${payslip.eligibleDays}/${payslip.workingDays} days):`, 50, rowY);
    doc.text(formatPkr(payslip.earnedGross), 180, rowY, { align: 'right', width: 100 });
  }

  // 5. Net Payable Box
  const netBoxY = Math.max(rowY + 40, tableTopY + 160);
  doc.rect(40, netBoxY, 515, 45).fillAndStroke('#eff6ff', '#3b82f6');
  doc.fillColor('#1e40af').font('Helvetica-Bold').fontSize(13);
  doc.text('NET PAYABLE AMOUNT:', 60, netBoxY + 16);
  doc.text(formatPkr(payslip.netPay), 300, netBoxY + 14, { align: 'right', width: 235 });

  // 6. Footer
  const footerY = 740;
  doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(40, footerY).lineTo(555, footerY).stroke();
  doc.fontSize(8).font('Helvetica').fillColor('#9ca3af')
    .text('This is a computer generated document and does not require a physical signature.', 40, footerY + 8, {
      align: 'center',
      width: 515,
    });
  doc.text(`Generated on ${new Date().toISOString()} | HCM Lite Payroll System`, 40, footerY + 20, {
    align: 'center',
    width: 515,
  });

  doc.end();
}

function round2(val) {
  return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
}

module.exports = {
  streamPayslipPdf,
  formatPkr,
};
