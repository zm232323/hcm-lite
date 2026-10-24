import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Loader } from '../../components/shared/Loader';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { getErrorMessage, formatDate } from '../../lib/utils';
import { formatPkr } from './SalaryStructuresPage';
import {
  FileText, Download, Calendar, DollarSign, CheckCircle2,
  Lock, TrendingDown, Eye, X,
} from 'lucide-react';

export default function MyPayslipsPage() {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [breakdownSlip, setBreakdownSlip] = useState(null);

  const fetchMyPayslips = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/payroll/payslips/me');
      setPayslips(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyPayslips();
  }, []);

  // Secure PDF Download with Authorization header and Axios blob
  const handleDownloadPdf = async (payslip) => {
    try {
      setDownloadingId(payslip._id);
      const res = await api.get(`/payroll/payslips/${payslip._id}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslip-${payslip.month}-${payslip.employeeCode}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download PDF: ' + getErrorMessage(err));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <FileText className="h-7 w-7 text-primary" />
          My Payslips
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Access and download your finalized monthly salary statements and breakdown.
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <Loader className="py-20" />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchMyPayslips} />
      ) : payslips.length === 0 ? (
        <EmptyState
          title="No payslips available"
          description="Your monthly payslips will appear here once finalized by HR and Administration."
        />
      ) : (
        <div className="space-y-4">
          {payslips.map((slip) => (
            <div
              key={slip._id}
              className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm hover:border-primary/40 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-foreground font-mono">
                        {slip.month}
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        <Lock className="h-3 w-3" />
                        Finalized
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {slip.departmentName} • {slip.designationName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => setBreakdownSlip(slip)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted text-foreground transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Details
                  </button>
                  <button
                    disabled={downloadingId === slip._id}
                    onClick={() => handleDownloadPdf(slip)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
                  >
                    <Download className={`h-3.5 w-3.5 ${downloadingId === slip._id ? 'animate-bounce' : ''}`} />
                    {downloadingId === slip._id ? 'Downloading...' : 'Download PDF'}
                  </button>
                </div>
              </div>

              {/* Financial Snapshot Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-border/60 text-xs font-mono">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5">
                  <span className="text-[11px] font-sans text-muted-foreground">Earned Gross:</span>
                  <p className="font-semibold text-foreground mt-0.5">{formatPkr(slip.earnedGross)}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5">
                  <span className="text-[11px] font-sans text-muted-foreground">Deductions ({slip.deductionDays}d):</span>
                  <p className="font-semibold text-amber-600 mt-0.5">{formatPkr(slip.deduction)}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5">
                  <span className="text-[11px] font-sans text-muted-foreground">Income Tax:</span>
                  <p className="font-semibold text-rose-600 mt-0.5">{formatPkr(slip.tax)}</p>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                  <span className="text-[11px] font-sans font-semibold text-emerald-600">Net Take-Home:</span>
                  <p className="font-bold text-emerald-700 dark:text-emerald-400 text-sm mt-0.5">
                    {formatPkr(slip.netPay)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payslip Breakdown Dialog for Employee */}
      {breakdownSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Payslip Breakdown — {breakdownSlip.month}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {breakdownSlip.employeeName} ({breakdownSlip.employeeCode})
                </p>
              </div>
              <button
                onClick={() => setBreakdownSlip(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Earnings */}
            <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2 text-xs">
              <span className="font-semibold text-foreground uppercase tracking-wider text-[10px]">
                Earnings Breakdown
              </span>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground font-mono">
                <div>Basic Salary: <span className="text-foreground">{formatPkr(breakdownSlip.basic)}</span></div>
                <div>HRA ({breakdownSlip.hraPercent}%): <span className="text-foreground">{formatPkr(breakdownSlip.hra)}</span></div>
                <div>Medical ({breakdownSlip.medicalPercent}%): <span className="text-foreground">{formatPkr(breakdownSlip.medical)}</span></div>
                <div>Other: <span className="text-foreground">{formatPkr(breakdownSlip.otherAllowance)}</span></div>
              </div>
              <div className="pt-1.5 border-t border-border flex justify-between font-bold text-foreground">
                <span>Earned Gross ({breakdownSlip.eligibleDays}/{breakdownSlip.workingDays} days):</span>
                <span className="font-mono text-primary">{formatPkr(breakdownSlip.earnedGross)}</span>
              </div>
            </div>

            {/* Deductions */}
            <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2 text-xs">
              <span className="font-semibold text-foreground uppercase tracking-wider text-[10px]">
                Attendance & Deductions
              </span>
              <div className="space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Absent Days:</span>
                  <span className="font-mono text-foreground">{breakdownSlip.absentDays}</span>
                </div>
                <div className="flex justify-between">
                  <span>Unpaid Leave Days:</span>
                  <span className="font-mono text-foreground">{breakdownSlip.unpaidLeaveDays}</span>
                </div>
                <div className="flex justify-between">
                  <span>Half Days ({breakdownSlip.halfDays} × 0.5):</span>
                  <span className="font-mono text-foreground">{breakdownSlip.halfDays * 0.5}</span>
                </div>
                <div className="flex justify-between font-semibold text-foreground pt-1">
                  <span>Total Deduction Days:</span>
                  <span className="font-mono text-amber-600">{breakdownSlip.deductionDays} days</span>
                </div>
              </div>
              <div className="pt-1.5 border-t border-border flex justify-between font-bold text-foreground">
                <span>Total Deductions:</span>
                <span className="font-mono text-amber-600">{formatPkr(breakdownSlip.deduction)}</span>
              </div>
            </div>

            {/* Tax & Net */}
            <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2 text-xs">
              <span className="font-semibold text-foreground uppercase tracking-wider text-[10px]">
                Taxes & Net Pay
              </span>
              <div className="flex justify-between text-muted-foreground">
                <span>Income Tax (Monthly):</span>
                <span className="font-mono text-rose-600 font-semibold">{formatPkr(breakdownSlip.tax)}</span>
              </div>
              <div className="pt-2 border-t border-emerald-500/20 bg-emerald-500/5 -mx-3.5 -mb-3.5 p-3 rounded-b-xl flex justify-between items-center font-bold">
                <span className="text-emerald-700 dark:text-emerald-400">Net Take-Home Pay:</span>
                <span className="font-mono text-base text-emerald-600 dark:text-emerald-400">
                  {formatPkr(breakdownSlip.netPay)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBreakdownSlip(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleDownloadPdf(breakdownSlip)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
