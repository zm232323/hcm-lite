import { useState, useEffect, useCallback } from 'react';
import { Clock, LogIn, LogOut, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import api from '../../lib/api';
import { getErrorMessage } from '../../lib/utils';

export function CheckInWidget({ onAttendanceUpdated, className = '' }) {
  const [nowTime, setNowTime] = useState('');
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Live clock in Asia/Karachi (UTC+5)
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const timeStr = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Karachi',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(d);
      setNowTime(timeStr);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchTodayStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/me');
      const todayStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Karachi',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());

      const today = (res.data.days || []).find((d) => d.date === todayStr);
      setTodayRecord(today || null);
    } catch (err) {
      // If error (e.g. non-employee), fail silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayStatus();
  }, [fetchTodayStatus]);

  const handleCheckIn = async () => {
    setActionLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api.post('/attendance/check-in', {});
      setMessage('Checked in successfully!');
      fetchTodayStatus();
      if (onAttendanceUpdated) onAttendanceUpdated(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api.post('/attendance/check-out', {});
      setMessage('Checked out successfully!');
      fetchTodayStatus();
      if (onAttendanceUpdated) onAttendanceUpdated(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const isCheckedIn = !!todayRecord?.checkInAt;
  const isCheckedOut = !!todayRecord?.checkOutAt;

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '—';
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Karachi',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(dateStr));
  };

  return (
    <div className={`rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Clock className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">Time Attendance</h3>
              <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded">
                PKT (UTC+5)
              </span>
            </div>
            <p className="text-lg font-bold font-mono text-primary tracking-wide">{nowTime || '--:--:--'}</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          {!isCheckedIn ? (
            <button
              onClick={handleCheckIn}
              disabled={actionLoading || loading}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" />
              <span>{actionLoading ? 'Stamping...' : 'Check In'}</span>
            </button>
          ) : !isCheckedOut ? (
            <button
              onClick={handleCheckOut}
              disabled={actionLoading || loading}
              className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              <span>{actionLoading ? 'Stamping...' : 'Check Out'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-xl border border-green-500/30 bg-green-500/10 px-3.5 py-2 text-xs font-semibold text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Completed for today</span>
            </div>
          )}
        </div>
      </div>

      {/* Today summary chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1 border-t border-border/50">
        <div className="rounded-xl border border-border bg-muted/30 p-2.5">
          <span className="text-[10px] text-muted-foreground block">Check-in</span>
          <span className="font-mono font-medium text-foreground">{formatTimestamp(todayRecord?.checkInAt)}</span>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-2.5">
          <span className="text-[10px] text-muted-foreground block">Check-out</span>
          <span className="font-mono font-medium text-foreground">{formatTimestamp(todayRecord?.checkOutAt)}</span>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-2.5">
          <span className="text-[10px] text-muted-foreground block">Worked</span>
          <span className="font-mono font-medium text-foreground">
            {todayRecord?.workedMinutes
              ? `${Math.floor(todayRecord.workedMinutes / 60)}h ${todayRecord.workedMinutes % 60}m`
              : '—'}
          </span>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-2.5">
          <span className="text-[10px] text-muted-foreground block">Status</span>
          <span className="font-medium text-foreground capitalize">
            {todayRecord?.status ? todayRecord.status.replace('_', ' ') : 'Not checked in'}
          </span>
        </div>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 p-2.5 text-xs text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
