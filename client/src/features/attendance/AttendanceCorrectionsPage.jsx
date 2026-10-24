import { useState, useEffect, useCallback } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  MessageSquare,
  User,
  Calendar,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Loader } from '../../components/shared/Loader';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { formatDate, getErrorMessage } from '../../lib/utils';

export default function AttendanceCorrectionsPage() {
  const { user } = useAuth();
  const isHr = user?.role === 'hr';

  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');

  // Decision Modal
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [selectedCorrection, setSelectedCorrection] = useState(null);
  const [decisionType, setDecisionType] = useState('approve');
  const [decisionComment, setDecisionComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const fetchCorrections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/attendance/corrections', {
        params: { status: statusFilter !== 'all' ? statusFilter : undefined },
      });
      setCorrections(res.data.corrections || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchCorrections();
  }, [fetchCorrections]);

  const handleOpenDecision = (correction, type) => {
    setSelectedCorrection(correction);
    setDecisionType(type);
    setDecisionComment('');
    setActionError('');
    setDecisionModalOpen(true);
  };

  const handleConfirmDecision = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError('');

    try {
      await api.patch(`/attendance/corrections/${selectedCorrection._id}/decision`, {
        decision: decisionType,
        comment: decisionComment,
      });
      setDecisionModalOpen(false);
      setToastMessage(`Correction request ${decisionType}d successfully!`);
      setTimeout(() => setToastMessage(''), 4000);
      fetchCorrections();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-[11px] font-medium text-green-600 dark:text-green-400 border border-green-500/20">Approved</span>;
      case 'rejected':
        return <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-[11px] font-medium text-destructive border border-destructive/20">Rejected</span>;
      default:
        return <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">Pending</span>;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Attendance Corrections</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isHr ? 'Review and decide employee punch time adjustment requests' : 'View your submitted attendance correction requests'}
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl p-1 text-xs">
          {['pending', 'approved', 'rejected', 'all'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
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

      {loading ? (
        <Loader className="min-h-[40vh]" />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchCorrections} />
      ) : corrections.length === 0 ? (
        <EmptyState
          title={`No ${statusFilter === 'all' ? '' : statusFilter} corrections found`}
          description={isHr ? 'No attendance adjustment requests require action at this time.' : 'You have not submitted any correction requests matching this filter.'}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {corrections.map((corr) => (
            <div key={corr._id} className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3 text-xs hover:border-primary/40 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                    <CalendarClock className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {corr.employeeId?.name || 'Employee'}
                      {corr.employeeId?.employeeCode && (
                        <span className="font-mono text-muted-foreground font-normal ml-2">({corr.employeeId.employeeCode})</span>
                      )}
                    </h3>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Calendar className="h-3 w-3" /> Target Date: <strong className="text-foreground">{formatDate(corr.date)}</strong>
                    </p>
                  </div>
                </div>
                <div>{getStatusBadge(corr.status)}</div>
              </div>

              {/* Punch Times Requested */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-muted/30 rounded-xl p-3 border border-border/60 font-mono text-[11px]">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-sans">Requested In</span>
                  <span className="font-medium text-foreground">
                    {new Date(corr.requestedCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-sans">Requested Out</span>
                  <span className="font-medium text-foreground">
                    {new Date(corr.requestedCheckOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-muted-foreground block font-sans">Net Worked</span>
                  <span className="font-medium text-foreground">
                    {(
                      Math.max(0, new Date(corr.requestedCheckOut) - new Date(corr.requestedCheckIn)) /
                      (1000 * 60 * 60)
                    ).toFixed(1)} hrs
                  </span>
                </div>
              </div>

              {/* Reason */}
              <div className="text-muted-foreground text-[11px] bg-muted/10 p-2.5 rounded-lg border border-border/40">
                <span className="font-medium text-foreground">Reason: </span>
                {corr.reason}
              </div>

              {/* Decision comment if already decided */}
              {corr.decisionComment && (
                <div className="text-[11px] text-muted-foreground italic flex items-center gap-1.5 pl-1">
                  <MessageSquare className="h-3 w-3" />
                  <span>Decision comment: "{corr.decisionComment}"</span>
                </div>
              )}

              {/* Action buttons for HR */}
              {isHr && corr.status === 'pending' && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                  <button
                    onClick={() => handleOpenDecision(corr, 'reject')}
                    className="rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 px-3.5 py-1.5 font-semibold transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleOpenDecision(corr, 'approve')}
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
      {decisionModalOpen && selectedCorrection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDecisionModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl text-xs space-y-4">
            <h3 className="text-base font-bold text-foreground">
              {decisionType === 'approve' ? 'Approve' : 'Reject'} Attendance Correction
            </h3>
            <p className="text-muted-foreground">
              {decisionType === 'approve'
                ? `Approving will update the attendance record for ${selectedCorrection.employeeId?.name || 'the employee'} on ${selectedCorrection.date}.`
                : `Please provide a reason for rejecting this correction request.`}
            </p>

            {actionError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{actionError}</span>
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
                  placeholder={decisionType === 'reject' ? 'Reason for rejection...' : 'Optional approval comment...'}
                  required={decisionType === 'reject'}
                  className="w-full rounded-xl border border-input bg-background p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDecisionModalOpen(false)}
                  disabled={actionLoading}
                  className="rounded-xl border border-border px-4 py-2 font-medium text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`rounded-xl px-4 py-2 font-semibold text-white shadow-sm disabled:opacity-50 ${
                    decisionType === 'approve' ? 'bg-primary hover:bg-primary/90' : 'bg-destructive hover:bg-destructive/90'
                  }`}
                >
                  {actionLoading ? 'Processing...' : `Confirm ${decisionType === 'approve' ? 'Approval' : 'Rejection'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
