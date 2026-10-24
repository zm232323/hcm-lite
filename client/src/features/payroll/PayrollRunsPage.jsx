import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { Loader } from '../../components/shared/Loader';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { getErrorMessage, formatDate } from '../../lib/utils';
import { formatPkr } from './SalaryStructuresPage';
import {
  FileText, Plus, Lock, RefreshCw, Trash2, CheckCircle2,
  Download, Eye, Search, Filter, ChevronLeft, ChevronRight,
  AlertCircle, X, ShieldAlert, ArrowLeft, Users, DollarSign,
  TrendingDown, Check,
} from 'lucide-react';

export default function PayrollRunsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isHr = user?.role === 'hr';

  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected Run Detail
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [runLoading, setRunLoading] = useState(false);
  const [runError, setRunError] = useState('');

  // Filters for payslips inside a run
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Create Draft Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newMonth, setNewMonth] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [finalizeConfirmOpen, setFinalizeConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Payslip Breakdown Modal
  const [breakdownSlip, setBreakdownSlip] = useState(null);

  // Load Departments for filtering
  useEffect(() => {
    api.get('/org/departments')
      .then((res) => setDepartments(res.data.filter((d) => d.isActive)))
      .catch(() => {});
  }, []);

  // Fetch all runs
  const fetchRuns = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/payroll/runs');
      setRuns(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  // Fetch single run details
  const fetchRunDetails = async (id, currentPage = page) => {
    if (!id) return;
    try {
      setRunLoading(true);
      setRunError('');
      const params = new URLSearchParams();
      params.append('page', currentPage);
      params.append('limit', 10);
      if (search.trim()) params.append('q', search.trim());
      if (departmentId) params.append('departmentId', departmentId);

      const res = await api.get(`/payroll/runs/${id}?${params.toString()}`);
      setSelectedRun(res.data.run);
      setPayslips(res.data.payslips);
      setTotalPages(res.data.pagination.pages);
      setTotal(res.data.pagination.total);
    } catch (err) {
      setRunError(getErrorMessage(err));
    } finally {
      setRunLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRunId) {
      fetchRunDetails(selectedRunId, page);
    }
  }, [selectedRunId, page, departmentId]);

  // Handle Search in payslips
  const handlePayslipSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRunDetails(selectedRunId, 1);
  };

  // Create Draft Run (HR only)
  const handleCreateRun = async (e) => {
    e.preventDefault();
    if (!newMonth) return;
    try {
      setCreating(true);
      setCreateError('');
      const res = await api.post('/payroll/runs', { month: newMonth });
      setCreateModalOpen(false);
      setNewMonth('');
      await fetchRuns();
      setSelectedRunId(res.data._id);
    } catch (err) {
      setCreateError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  // Recalculate Draft Run (HR only)
  const handleRecalculate = async () => {
    if (!selectedRunId) return;
    try {
      setActionLoading(true);
      await api.post(`/payroll/runs/${selectedRunId}/recalculate`);
      await fetchRunDetails(selectedRunId, page);
      await fetchRuns();
    } catch (err) {
      alert('Recalculate failed: ' + getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Draft Run (HR only)
  const handleDelete = async () => {
    if (!selectedRunId) return;
    try {
      setActionLoading(true);
      await api.delete(`/payroll/runs/${selectedRunId}`);
      setDeleteConfirmOpen(false);
      setSelectedRunId(null);
      setSelectedRun(null);
      await fetchRuns();
    } catch (err) {
      alert('Delete failed: ' + getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  // Finalize Run (Admin only)
  const handleFinalize = async () => {
    if (!selectedRunId) return;
    try {
      setActionLoading(true);
      await api.post(`/payroll/runs/${selectedRunId}/finalize`);
      setFinalizeConfirmOpen(false);
      await fetchRunDetails(selectedRunId, page);
      await fetchRuns();
    } catch (err) {
      alert('Finalize failed: ' + getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  // Secure PDF Download using blob + Auth header
  const handleDownloadPdf = async (payslip) => {
    try {
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
      alert('Download PDF failed: ' + getErrorMessage(err));
    }
  };

  // ==========================================
  // VIEW 1: RUN DETAILS VIEW
  // ==========================================
  if (selectedRunId) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Back navigation & Run Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedRunId(null);
                setSelectedRun(null);
                setSearch('');
                setDepartmentId('');
              }}
              className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Payroll Run — {selectedRun?.month}
                </h1>
                {selectedRun?.status === 'finalized' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    <Lock className="h-3 w-3" />
                    Finalized
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    Draft
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Created by {selectedRun?.createdBy?.name || 'HR'}
                {selectedRun?.finalizedAt && ` • Finalized on ${formatDate(selectedRun.finalizedAt)} by ${selectedRun?.finalizedBy?.name}`}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {selectedRun?.status === 'draft' && (
              <>
                {isHr && (
                  <>
                    <button
                      onClick={handleRecalculate}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                      Recalculate
                    </button>
                    <button
                      onClick={() => setDeleteConfirmOpen(true)}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Draft
                    </button>
                  </>
                )}

                {isAdmin && (
                  <button
                    onClick={() => setFinalizeConfirmOpen(true)}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Finalize Payroll
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Totals Metric Cards */}
        {selectedRun && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" /> Employees
              </span>
              <p className="text-xl font-bold font-mono text-foreground">
                {selectedRun.totals?.employees || 0}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-blue-500" /> Gross Earned
              </span>
              <p className="text-lg font-bold font-mono text-foreground">
                {formatPkr(selectedRun.totals?.gross || 0, 0)}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <TrendingDown className="h-4 w-4 text-amber-500" /> Deductions
              </span>
              <p className="text-lg font-bold font-mono text-amber-600">
                {formatPkr(selectedRun.totals?.deductions || 0, 0)}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-rose-500" /> Income Tax
              </span>
              <p className="text-lg font-bold font-mono text-rose-600">
                {formatPkr(selectedRun.totals?.tax || 0, 0)}
              </p>
            </div>

            <div className="col-span-2 lg:col-span-1 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-1">
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Net Payable
              </span>
              <p className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
                {formatPkr(selectedRun.totals?.net || 0, 0)}
              </p>
            </div>
          </div>
        )}

        {/* Search & Filter within Run */}
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handlePayslipSearch} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search payslips by name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </form>

          <select
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm rounded-xl border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Payslips List */}
        {runLoading ? (
          <Loader className="py-20" />
        ) : runError ? (
          <ErrorState message={runError} onRetry={() => fetchRunDetails(selectedRunId, page)} />
        ) : payslips.length === 0 ? (
          <EmptyState
            title="No payslips generated"
            description={search || departmentId ? 'No matching payslips' : 'No eligible employees found for this month'}
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 border-b border-border text-xs uppercase font-semibold text-muted-foreground">
                    <tr>
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4">Department</th>
                      <th className="px-6 py-4 text-right">Days (Work/Elig)</th>
                      <th className="px-6 py-4 text-right">Earned Gross</th>
                      <th className="px-6 py-4 text-right">Deductions</th>
                      <th className="px-6 py-4 text-right">Tax</th>
                      <th className="px-6 py-4 text-right">Net Pay</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {payslips.map((slip) => (
                      <tr key={slip._id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-foreground">{slip.employeeName}</div>
                          <div className="text-xs font-mono text-muted-foreground">{slip.employeeCode}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs font-medium text-foreground">{slip.departmentName || '—'}</div>
                          <div className="text-xs text-muted-foreground">{slip.designationName || '—'}</div>
                        </td>
                        <td className="px-6 py-4 text-right text-xs font-mono">
                          {slip.eligibleDays} / {slip.workingDays}
                          {slip.deductionDays > 0 && (
                            <span className="block text-[11px] text-amber-600">
                              (-{slip.deductionDays} days)
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-medium text-foreground">
                          {formatPkr(slip.earnedGross)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-xs text-amber-600">
                          {formatPkr(slip.deduction)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-xs text-rose-600">
                          {formatPkr(slip.tax)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">
                          {formatPkr(slip.netPay)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setBreakdownSlip(slip)}
                              title="View Breakdown"
                              className="p-1.5 rounded-lg border border-border hover:bg-muted text-foreground transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDownloadPdf(slip)}
                              title="Download PDF"
                              className="p-1.5 rounded-lg border border-border hover:bg-muted text-foreground transition-colors"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View (375px+) */}
            <div className="md:hidden space-y-3">
              {payslips.map((slip) => (
                <div key={slip._id} className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-foreground text-sm">{slip.employeeName}</h4>
                      <p className="text-xs font-mono text-muted-foreground">{slip.employeeCode}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {slip.departmentName} • {slip.designationName}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setBreakdownSlip(slip)}
                        className="p-2 rounded-lg border border-border hover:bg-muted text-foreground"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadPdf(slip)}
                        className="p-2 rounded-lg border border-border hover:bg-muted text-foreground"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs font-mono">
                    <div>
                      <span className="text-muted-foreground font-sans">Days:</span> {slip.eligibleDays}/{slip.workingDays}
                    </div>
                    <div>
                      <span className="text-muted-foreground font-sans">Earned Gross:</span> {formatPkr(slip.earnedGross, 0)}
                    </div>
                    <div>
                      <span className="text-muted-foreground font-sans">Deductions:</span> {formatPkr(slip.deduction, 0)}
                    </div>
                    <div>
                      <span className="text-muted-foreground font-sans">Tax:</span> {formatPkr(slip.tax, 0)}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Net Pay:</span>
                    <span className="font-mono font-bold text-emerald-600 text-sm">
                      {formatPkr(slip.netPay)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2 pt-2 text-xs text-muted-foreground">
                <span>Showing {payslips.length} of {total} payslips</span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-border bg-card text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="font-medium">{page} / {totalPages}</span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-border bg-card text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Payslip Breakdown Modal */}
        {breakdownSlip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto animate-scale-in">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Calculation Breakdown — {breakdownSlip.month}
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

              {/* Step 1: Salary Structure & Gross */}
              <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2 text-xs">
                <span className="font-semibold text-foreground uppercase tracking-wider text-[10px]">
                  Step 1: Monthly Compensation
                </span>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground font-mono">
                  <div>Basic Salary: <span className="text-foreground">{formatPkr(breakdownSlip.basic)}</span></div>
                  <div>HRA ({breakdownSlip.hraPercent}%): <span className="text-foreground">{formatPkr(breakdownSlip.hra)}</span></div>
                  <div>Medical ({breakdownSlip.medicalPercent}%): <span className="text-foreground">{formatPkr(breakdownSlip.medical)}</span></div>
                  <div>Other Allowance: <span className="text-foreground">{formatPkr(breakdownSlip.otherAllowance)}</span></div>
                </div>
                <div className="pt-1.5 border-t border-border flex justify-between font-bold text-foreground">
                  <span>Full Month Gross:</span>
                  <span className="font-mono text-primary">{formatPkr(breakdownSlip.gross)}</span>
                </div>
              </div>

              {/* Step 2: Working Days & Proration */}
              <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2 text-xs">
                <span className="font-semibold text-foreground uppercase tracking-wider text-[10px]">
                  Step 2: Working Days & Proration
                </span>
                <div className="space-y-1 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Month Working Days:</span>
                    <span className="font-mono font-semibold text-foreground">{breakdownSlip.workingDays} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Eligible Days (Prorated):</span>
                    <span className="font-mono font-semibold text-foreground">{breakdownSlip.eligibleDays} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Daily Rate (Gross / Working Days):</span>
                    <span className="font-mono text-foreground">{formatPkr(breakdownSlip.perDay)}</span>
                  </div>
                </div>
                <div className="pt-1.5 border-t border-border flex justify-between font-bold text-foreground">
                  <span>Earned Gross:</span>
                  <span className="font-mono text-primary">{formatPkr(breakdownSlip.earnedGross)}</span>
                </div>
              </div>

              {/* Step 3: Deductions */}
              <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2 text-xs">
                <span className="font-semibold text-foreground uppercase tracking-wider text-[10px]">
                  Step 3: Deductions Calculation
                </span>
                <div className="space-y-1 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Absent Days (prior to today):</span>
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
                  <span>Total Deduction (Rate × Days):</span>
                  <span className="font-mono text-amber-600">{formatPkr(breakdownSlip.deduction)}</span>
                </div>
              </div>

              {/* Step 4: Tax & Net Pay */}
              <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2 text-xs">
                <span className="font-semibold text-foreground uppercase tracking-wider text-[10px]">
                  Step 4: Taxes & Final Net Pay
                </span>
                <div className="space-y-1 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Annual Gross ({formatPkr(breakdownSlip.gross)} × 12):</span>
                    <span className="font-mono text-foreground">{formatPkr(breakdownSlip.gross * 12)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Income Tax (Monthly Prorated):</span>
                    <span className="font-mono text-rose-600 font-semibold">{formatPkr(breakdownSlip.tax)}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-emerald-500/20 bg-emerald-500/5 -mx-3.5 -mb-3.5 p-3 rounded-b-xl flex justify-between items-center font-bold">
                  <span className="text-emerald-700 dark:text-emerald-400">Net Payable Amount:</span>
                  <span className="font-mono text-base text-emerald-600 dark:text-emerald-400">
                    {formatPkr(breakdownSlip.netPay)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setBreakdownSlip(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Finalize Confirmation Dialog (Admin only) */}
        {finalizeConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 animate-scale-in">
              <div className="flex items-center gap-3 text-destructive">
                <div className="p-2.5 rounded-full bg-destructive/10">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Lock and Finalize Payroll?</h3>
                  <p className="text-xs text-muted-foreground">{selectedRun?.month}</p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-2">
                <p>
                  <strong>Warning:</strong> Once finalized, this month's payroll run will be{' '}
                  <span className="text-destructive font-semibold">permanently locked</span>.
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Payslips and totals will become immutable snapshots.</li>
                  <li>Recalculating, deleting, or altering this run will return 409 Conflict.</li>
                  <li>Automated notifications will be dispatched to all {selectedRun?.totals?.employees} employees.</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setFinalizeConfirmOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-border hover:bg-muted text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleFinalize}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  <Lock className="h-3.5 w-3.5" />
                  {actionLoading ? 'Finalizing...' : 'Yes, Lock & Finalize'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Draft Confirmation Dialog */}
        {deleteConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 animate-scale-in">
              <h3 className="text-base font-bold text-foreground">Delete Draft Payroll Run?</h3>
              <p className="text-xs text-muted-foreground">
                Are you sure you want to delete the draft payroll run for {selectedRun?.month}? All generated draft payslips will be permanently discarded.
              </p>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setDeleteConfirmOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-border hover:bg-muted text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {actionLoading ? 'Deleting...' : 'Delete Draft'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW 2: RUNS LIST VIEW
  // ==========================================
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <FileText className="h-7 w-7 text-primary" />
            Payroll Runs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review monthly payroll drafts, view calculations, and lock finalized salary disbursements.
          </p>
        </div>

        {isHr && (
          <button
            onClick={() => {
              const now = new Date();
              const currMonth = now.toISOString().slice(0, 7);
              setNewMonth(currMonth);
              setCreateError('');
              setCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Create Draft Run
          </button>
        )}
      </div>

      {/* Runs List */}
      {loading ? (
        <Loader className="py-20" />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchRuns} />
      ) : runs.length === 0 ? (
        <EmptyState
          title="No payroll runs yet"
          description={isHr ? 'Click "Create Draft Run" to generate the first monthly payroll.' : 'No payroll runs have been drafted by HR yet.'}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {runs.map((run) => {
            const isFinalized = run.status === 'finalized';
            return (
              <div
                key={run._id}
                onClick={() => setSelectedRunId(run._id)}
                className="rounded-2xl border border-border bg-card p-5 space-y-4 hover:border-primary/50 transition-all cursor-pointer shadow-sm group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {run.month}
                    </span>
                  </div>
                  {isFinalized ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      <Lock className="h-3 w-3" />
                      Finalized
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      Draft
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/60">
                  <div>
                    <span className="text-muted-foreground">Employees:</span>
                    <p className="font-mono font-medium text-foreground">{run.totals?.employees || 0}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Gross Earned:</span>
                    <p className="font-mono font-medium text-foreground">{formatPkr(run.totals?.gross || 0, 0)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Deductions:</span>
                    <p className="font-mono font-medium text-amber-600">{formatPkr(run.totals?.deductions || 0, 0)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Income Tax:</span>
                    <p className="font-mono font-medium text-rose-600">{formatPkr(run.totals?.tax || 0, 0)}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Net Disbursement:</span>
                  <span className="font-mono font-bold text-emerald-600 text-sm">
                    {formatPkr(run.totals?.net || 0, 0)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Draft Run Dialog (HR only) */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Create Draft Payroll Run</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateRun} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Select Month <span className="text-destructive">*</span>
                </label>
                <input
                  type="month"
                  required
                  value={newMonth}
                  onChange={(e) => setNewMonth(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Drafting computes all employee attendance, deductions, proration, and tax automatically.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-border hover:bg-muted text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {creating ? 'Computing...' : 'Generate Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
