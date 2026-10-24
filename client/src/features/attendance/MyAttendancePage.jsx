import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  CalendarClock,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import api from '../../lib/api';
import { Loader } from '../../components/shared/Loader';
import { ErrorState } from '../../components/shared/ErrorState';
import { CheckInWidget } from './CheckInWidget';
import { RequestCorrectionModal } from './RequestCorrectionModal';
import { formatDate } from '../../lib/utils';

export default function MyAttendancePage() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/attendance/me', { params: { month: currentMonth } });
      setAttendanceData(res.data);
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handlePrevMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setCurrentMonth(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    setCurrentMonth(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present':
        return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
      case 'late':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'half_day':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'absent':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'on_leave':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'holiday':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'missing_checkout':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
      case 'weekend':
        return 'bg-muted/40 text-muted-foreground border-transparent';
      default:
        return 'bg-muted/20 text-muted-foreground/60 border-transparent';
    }
  };

  const formatMonthTitle = (monthStr) => {
    const [y, m] = monthStr.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">My Attendance</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Log your daily punches, review monthly time sheets, and request punch corrections
          </p>
        </div>
        <button
          onClick={() => setCorrectionModalOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-sm"
        >
          <CalendarClock className="h-4 w-4 text-primary" />
          <span>Request Correction</span>
        </button>
      </div>

      {successToast && (
        <div className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-xs text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Live Check-In Widget */}
      <CheckInWidget onAttendanceUpdated={fetchAttendance} />

      {/* Monthly Summary Cards */}
      {attendanceData?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
          <div className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
            <span className="text-[10px] text-muted-foreground block">Present Days</span>
            <span className="text-lg font-bold font-mono text-green-600 dark:text-green-400">
              {attendanceData.summary.present}
            </span>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
            <span className="text-[10px] text-muted-foreground block">Late Arrivals</span>
            <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
              {attendanceData.summary.late}
            </span>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
            <span className="text-[10px] text-muted-foreground block">Half Days</span>
            <span className="text-lg font-bold font-mono text-purple-600 dark:text-purple-400">
              {attendanceData.summary.half_day}
            </span>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
            <span className="text-[10px] text-muted-foreground block">Absences</span>
            <span className="text-lg font-bold font-mono text-destructive">
              {attendanceData.summary.absent}
            </span>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
            <span className="text-[10px] text-muted-foreground block">On Leave</span>
            <span className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400">
              {attendanceData.summary.on_leave}
            </span>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
            <span className="text-[10px] text-muted-foreground block">Hours Worked</span>
            <span className="text-lg font-bold font-mono text-foreground">
              {(attendanceData.summary.totalWorkedMinutes / 60).toFixed(1)}h
            </span>
          </div>
        </div>
      )}

      {/* Monthly Calendar View */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        {/* Month Selector */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">{formatMonthTitle(currentMonth)}</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevMonth}
              className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <Loader className="min-h-[30vh]" />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchAttendance} />
        ) : (
          <div>
            {/* Days Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
              {attendanceData?.days?.map((d) => {
                const dayNum = parseInt(d.date.split('-')[2], 10);
                const isSelected = selectedDay?.date === d.date;
                return (
                  <div
                    key={d.date}
                    onClick={() => setSelectedDay(d)}
                    className={`rounded-xl border p-2.5 cursor-pointer transition-all hover:scale-[1.02] ${getStatusColor(
                      d.status
                    )} ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-xs">{dayNum}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider">
                        {d.status.replace('_', ' ')}
                      </span>
                    </div>
                    {d.holidayName && (
                      <p className="text-[10px] truncate text-emerald-600 dark:text-emerald-400 font-medium">
                        {d.holidayName}
                      </p>
                    )}
                    {d.checkInAt && (
                      <p className="text-[10px] font-mono text-muted-foreground">
                        In: {new Date(d.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                    {d.workedMinutes > 0 && (
                      <p className="text-[10px] font-mono text-muted-foreground">
                        {Math.floor(d.workedMinutes / 60)}h {d.workedMinutes % 60}m
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected Day Inspector */}
            {selectedDay && (
              <div className="mt-5 rounded-xl border border-border bg-muted/30 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in text-xs">
                <div>
                  <h4 className="font-bold text-foreground">
                    Details for {formatDate(selectedDay.date)}
                  </h4>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-muted-foreground">
                    <span>
                      Status: <strong className="text-foreground capitalize">{selectedDay.status.replace('_', ' ')}</strong>
                    </span>
                    {selectedDay.checkInAt && (
                      <span>
                        In: <strong>{new Date(selectedDay.checkInAt).toLocaleTimeString()}</strong>
                      </span>
                    )}
                    {selectedDay.checkOutAt && (
                      <span>
                        Out: <strong>{new Date(selectedDay.checkOutAt).toLocaleTimeString()}</strong>
                      </span>
                    )}
                    {selectedDay.workedMinutes > 0 && (
                      <span>
                        Worked: <strong>{Math.floor(selectedDay.workedMinutes / 60)}h {selectedDay.workedMinutes % 60}m</strong>
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setCorrectionModalOpen(true)}
                  className="rounded-lg bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 font-medium transition-colors"
                >
                  Request Correction for this Day
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Request Correction Modal */}
      <RequestCorrectionModal
        open={correctionModalOpen}
        defaultDate={selectedDay?.date}
        onClose={() => setCorrectionModalOpen(false)}
        onSuccess={() => {
          setCorrectionModalOpen(false);
          setSuccessToast('Attendance correction request submitted to HR!');
          setTimeout(() => setSuccessToast(''), 4000);
        }}
      />
    </div>
  );
}
