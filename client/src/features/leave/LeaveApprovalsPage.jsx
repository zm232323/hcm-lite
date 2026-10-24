import { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Building2,
  MessageSquare,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Loader } from '../../components/shared/Loader';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { formatDate, getErrorMessage } from '../../lib/utils';

export default function LeaveApprovalsPage() {
  const { user } = useAuth();
  const isHr = user?.role === 'hr';

  const [leaves, setLeaves] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('pending');
  const [departmentId, setDepartmentId] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Decision Modal
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [decisionType, setDecisionType] = useState('approve');
  const [decisionComment, setDecisionComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [decisionError, setDecisionError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Load departments
  useEffect(() => {
    api.get('/org/departments')
      .then((res) => setDepartments(res.data || []))
      .catch(() => {});
  }, []);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/leave', {
        params: {
          page,
          limit: 25,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          departmentId: departmentId || undefined,
        },
      });
      setLeaves(res.data.leaves || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, departmentId]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const handleOpenDecision = (leave, type) => {
    setSelectedLeave(leave);
    setDecisionType(type);
    setDecisionComment('');
    setDecisionError('');
    setDecisionModalOpen(true);
  };

  const handleConfirmDecision = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setDecisionError('');

    try {
      await api.patch(`/leave/${selectedLeave._id}/decision`, {
        decision: decisionType,
        comment: decisionComment,
      });
      setDecisionModalOpen(false);
      setToastMessage(`Leave request ${decisionType}d successfully!`);
      setTimeout(() => setToastMessage(''), 4000);
      fetchLeaves();
    } catch (err) {
      setDecisionError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-[11px] font-medium text-green-600 dark:text-green-400 border border-green-500/20">Approved</span>;
      case 'rejected':
        return <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-[11px] font-medium text-destructive border border-destructive/20">Rejected</span>;
      case 'cancelled':
        return <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">Cancelled</span>;
      default:
        return <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">Pending</span>;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {isHr ? 'Leave Approvals' : 'All Leave Requests'}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isHr ? 'Review and manage employee time-off and vacation requests' : 'Overview of organization-wide employee leave requests'}
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl p-1 text-xs">
          {['pending', 'approved', 'rejected', 'all'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setStatusFilter(tab);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium capitalize transition-all ${
                statusFilter === tab
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {toastMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-xs text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Department Filter */}
      <div className="flex items-center gap-2 max-w-xs text-xs">
        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <select
          value={departmentId}
          onChange={(e) => {
            setDepartmentId(e.target.value);
            setPage(1);
          }}
          className="w-full rounded-xl border border-input bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d._id} value={d._id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Main List */}
      {loading ? (
        <Loader className="min-h-[40vh]" />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchLeaves} />
      ) : leaves.length === 0 ? (
        <EmptyState
          title={`No ${statusFilter === 'all' ? '' : statusFilter} leave requests`}
          description="There are no employee leave applications matching your current filter selection."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {leaves.map((l) => (
            <div key={l._id} className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3 text-xs hover:border-primary/40 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-semibold text-foreground text-sm">
                      {l.employeeId?.name || 'Employee'}
                    </h3>
                    <span className="font-mono text-muted-foreground text-[11px]">
                      ({l.employeeId?.employeeCode || '—'})
                    </span>
                    <span className="text-muted-foreground">&bull;</span>
                    <span className="text-muted-foreground font-medium">
                      {l.employeeId?.departmentId?.name || 'Department'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <CalendarDays className="h-3.5 w-3.5 text-primary" />
                    <strong>{l.leaveTypeId?.name}</strong>: {formatDate(l.startDate)} &rarr; {formatDate(l.endDate)} ({l.days} {l.days === 1 ? 'day' : 'days'})
                  </p>
                </div>
                <div>{getStatusBadge(l.status)}</div>
              </div>

              {/* Reason */}
              <div className="text-muted-foreground text-[11px] bg-muted/20 p-2.5 rounded-xl border border-border/40">
                <span className="font-medium text-foreground">Reason: </span>
                {l.reason}
              </div>

              {/* Decision comment */}
              {l.decisionComment && (
                <div className="text-[11px] text-muted-foreground italic flex items-center gap-1.5 pl-1">
                  <MessageSquare className="h-3 w-3" />
                  <span>Decision comment: "{l.decisionComment}"</span>
                </div>
              )}

              {/* Actions for HR */}
              {isHr && l.status === 'pending' && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                  <button
                    onClick={() => handleOpenDecision(l, 'reject')}
                    className="rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 px-3.5 py-1.5 font-semibold transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleOpenDecision(l, 'approve')}
                    className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-1.5 font-semibold transition-colors shadow-sm"
                  >
                    Approve
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Decision Modal */}
      {decisionModalOpen && selectedLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDecisionModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl text-xs space-y-4">
            <h3 className="text-base font-bold text-foreground">
              {decisionType === 'approve' ? 'Approve' : 'Reject'} Leave Request
            </h3>
            <p className="text-muted-foreground">
              {decisionType === 'approve'
                ? `Confirm approval of ${selectedLeave.days} day(s) of ${selectedLeave.leaveTypeId?.name} for ${selectedLeave.employeeId?.name}.`
                : `Please provide a reason for rejecting this leave request.`}
            </p>

            {decisionError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{decisionError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmDecision} className="space-y-4">
              <div>
                <label className="block font-medium text-foreground mb-1">
                  Comment {decisionType === 'reject' && <span className="text-destructive">*</span>}
                </label>
                <textarea
                  rows={3}
                  value={decisionComment}
                  onChange={(e) => setDecisionComment(e.target.value)}
                  placeholder={decisionType === 'reject' ? 'Reason for rejection...' : 'Optional comment...'}
                  required={decisionType === 'reject'}
                  className="w-full rounded-xl border border-input bg-background p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDecisionModalOpen(false)}
                  disabled={submitting}
                  className="rounded-xl border border-border px-4 py-2 font-medium text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`rounded-xl px-4 py-2 font-semibold text-white shadow-sm disabled:opacity-50 ${
                    decisionType === 'approve' ? 'bg-primary hover:bg-primary/90' : 'bg-destructive hover:bg-destructive/90'
                  }`}
                >
                  {submitting ? 'Processing...' : `Confirm ${decisionType === 'approve' ? 'Approval' : 'Rejection'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
