import { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import api from '../../lib/api';
import { Loader } from '../../components/shared/Loader';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { LeaveBalanceCards } from './LeaveBalanceCards';
import { ApplyLeaveModal } from './ApplyLeaveModal';
import { formatDate, getErrorMessage } from '../../lib/utils';

export default function MyLeavesPage() {
  const [balances, setBalances] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [cancellingId, setCancellingId] = useState(null);

  const fetchLeaveData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [balRes, histRes] = await Promise.all([
        api.get('/leave/balance'),
        api.get('/leave/my'),
      ]);
      setBalances(balRes.data || []);
      setLeaves(histRes.data?.leaves || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaveData();
  }, [fetchLeaveData]);

  const handleCancelLeave = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this leave request?')) return;
    setCancellingId(id);
    try {
      await api.patch(`/leave/${id}/cancel`);
      setSuccessToast('Leave request cancelled successfully.');
      setTimeout(() => setSuccessToast(''), 4000);
      fetchLeaveData();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setCancellingId(null);
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
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Leave Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Check your annual quotas, plan time off, and track application status
          </p>
        </div>
        <button
          onClick={() => setApplyModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Apply for Leave</span>
        </button>
      </div>

      {successToast && (
        <div className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-xs text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Quota Balances */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" /> Leave Balances & Quotas
        </h2>
        <LeaveBalanceCards balances={balances} loading={loading} />
      </div>

      {/* Leave Application History */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Leave History & Requests
        </h2>

        {loading ? (
          <Loader className="min-h-[30vh]" />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchLeaveData} />
        ) : leaves.length === 0 ? (
          <EmptyState
            title="No leave requests yet"
            description="You have not submitted any leave applications this year."
            action={
              <button
                onClick={() => setApplyModalOpen(true)}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Apply for Leave
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {/* Desktop Table View */}
            <div className="hidden sm:block rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">Type</th>
                    <th className="px-5 py-3.5">Dates Span</th>
                    <th className="px-5 py-3.5">Days</th>
                    <th className="px-5 py-3.5">Reason</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {leaves.map((l) => (
                    <tr key={l._id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-foreground">
                        {l.leaveTypeId?.name || 'Leave'}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {formatDate(l.startDate)} &rarr; {formatDate(l.endDate)}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-medium text-foreground">
                        {l.days} {l.days === 1 ? 'day' : 'days'}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground max-w-xs truncate" title={l.reason}>
                        {l.reason}
                      </td>
                      <td className="px-5 py-3.5">{getStatusBadge(l.status)}</td>
                      <td className="px-5 py-3.5 text-right">
                        {(l.status === 'pending' || (l.status === 'approved' && l.startDate > new Date().toISOString().split('T')[0])) && (
                          <button
                            onClick={() => handleCancelLeave(l._id)}
                            disabled={cancellingId === l._id}
                            className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Cancel Leave Request"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="sm:hidden space-y-3">
              {leaves.map((l) => (
                <div key={l._id} className="rounded-2xl border border-border bg-card p-4 space-y-2.5 shadow-sm text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{l.leaveTypeId?.name}</span>
                    {getStatusBadge(l.status)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatDate(l.startDate)} &rarr; {formatDate(l.endDate)} ({l.days} working days)
                  </div>
                  <p className="text-[11px] text-muted-foreground italic bg-muted/20 p-2 rounded-lg">"{l.reason}"</p>
                  {(l.status === 'pending' || (l.status === 'approved' && l.startDate > new Date().toISOString().split('T')[0])) && (
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => handleCancelLeave(l._id)}
                        disabled={cancellingId === l._id}
                        className="text-[11px] font-medium text-destructive hover:underline"
                      >
                        Cancel Request
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      <ApplyLeaveModal
        open={applyModalOpen}
        balances={balances}
        onClose={() => setApplyModalOpen(false)}
        onSuccess={() => {
          setApplyModalOpen(false);
          setSuccessToast('Leave application submitted for approval!');
          setTimeout(() => setSuccessToast(''), 4000);
          fetchLeaveData();
        }}
      />
    </div>
  );
}
