import { useState, useEffect } from 'react';
import { X, CalendarPlus, AlertCircle, Info, Check } from 'lucide-react';
import api from '../../lib/api';
import { getErrorMessage, getFieldErrors } from '../../lib/utils';

export function ApplyLeaveModal({ open, balances = [], onClose, onSuccess }) {
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (balances.length > 0 && !leaveTypeId) {
      setLeaveTypeId(balances[0].leaveTypeId);
    }
  }, [balances, leaveTypeId]);

  // Live preview working days and conflicts
  useEffect(() => {
    if (leaveTypeId && startDate && endDate && startDate <= endDate) {
      setPreviewLoading(true);
      api.get('/leave/preview', {
        params: { leaveTypeId, startDate, endDate },
      })
        .then((res) => {
          setPreview(res.data);
          setGeneralError('');
        })
        .catch((err) => {
          setPreview(null);
          setGeneralError(getErrorMessage(err));
        })
        .finally(() => setPreviewLoading(false));
    } else {
      setPreview(null);
    }
  }, [leaveTypeId, startDate, endDate]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setGeneralError('');
    setFieldErrors({});

    try {
      const res = await api.post('/leave', {
        leaveTypeId,
        startDate,
        endDate,
        reason,
      });
      onSuccess(res.data);
    } catch (err) {
      setGeneralError(getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl text-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-2">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <CalendarPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Apply for Leave</h2>
              <p className="text-xs text-muted-foreground">Submit a leave request for management approval</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {generalError && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium text-foreground mb-1">Leave Type</label>
            <select
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
              required
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {balances.map((b) => (
                <option key={b.leaveTypeId} value={b.leaveTypeId}>
                  {b.name} ({b.quota !== null ? `${b.remaining} days left` : 'Unlimited'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-foreground mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {fieldErrors.startDate && (
                <p className="mt-1 text-destructive text-[11px]">{fieldErrors.startDate}</p>
              )}
            </div>

            <div>
              <label className="block font-medium text-foreground mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                min={startDate}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {fieldErrors.endDate && (
                <p className="mt-1 text-destructive text-[11px]">{fieldErrors.endDate}</p>
              )}
            </div>
          </div>

          {/* Live Preview calculation */}
          {preview && (
            <div className={`rounded-xl border p-3 space-y-1.5 ${
              preview.hasConflict
                ? 'border-destructive/30 bg-destructive/10 text-destructive'
                : 'border-primary/30 bg-primary/5 text-foreground'
            }`}>
              <div className="flex items-center justify-between font-medium">
                <span>Working days required:</span>
                <span className="font-mono text-sm font-bold">{preview.workingDays} day(s)</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Calendar span:</span>
                <span>{preview.totalDays} calendar days (weekends/holidays skipped)</span>
              </div>
              {preview.hasConflict ? (
                <div className="text-[11px] text-destructive flex items-center gap-1.5 pt-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{preview.conflictReason}</span>
                </div>
              ) : (
                <div className="text-[11px] text-green-600 dark:text-green-400 flex items-center gap-1.5 pt-1">
                  <Check className="h-3.5 w-3.5 shrink-0" />
                  <span>Quota available. Request can be submitted.</span>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block font-medium text-foreground mb-1">Reason for Leave</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a brief explanation for your leave..."
              required
              className="w-full rounded-xl border border-input bg-background p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {fieldErrors.reason && (
              <p className="mt-1 text-destructive text-[11px]">{fieldErrors.reason}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-border px-4 py-2 font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || preview?.hasConflict}
              className="rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Applying...' : 'Apply Leave'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
