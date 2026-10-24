import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Filter,
  Calendar,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import api from '../../lib/api';
import { Loader } from '../../components/shared/Loader';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { formatDate } from '../../lib/utils';

export default function AttendanceBoardPage() {
  const [date, setDate] = useState(() => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  });

  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [boardData, setBoardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load departments
  useEffect(() => {
    api.get('/org/departments')
      .then((res) => setDepartments(res.data || []))
      .catch(() => {});
  }, []);

  const fetchBoard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/attendance/board', {
        params: {
          date,
          departmentId: departmentId || undefined,
          q: debouncedSearch || undefined,
          page,
          limit: 30,
        },
      });
      setBoardData(res.data);
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to load attendance board');
    } finally {
      setLoading(false);
    }
  }, [date, departmentId, debouncedSearch, page]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'present':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-[11px] font-medium text-green-600 dark:text-green-400 border border-green-500/20">
            <CheckCircle2 className="h-3 w-3" /> Present
          </span>
        );
      case 'late':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="h-3 w-3" /> Late
          </span>
        );
      case 'half_day':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-medium text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <AlertTriangle className="h-3 w-3" /> Half Day
          </span>
        );
      case 'on_leave':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Calendar className="h-3 w-3" /> On Leave
          </span>
        );
      case 'absent':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-[11px] font-medium text-destructive border border-destructive/20">
            <XCircle className="h-3 w-3" /> Absent
          </span>
        );
      case 'missing_checkout':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-0.5 text-[11px] font-medium text-orange-600 dark:text-orange-400 border border-orange-500/20">
            <AlertCircle className="h-3 w-3" /> Missing Out
          </span>
        );
      case 'weekend':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            Weekend
          </span>
        );
      case 'holiday':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            Holiday
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            Scheduled
          </span>
        );
    }
  };

  const counts = boardData?.counts || {};

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Attendance Board</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Real-time workforce attendance tracking across departments and office locations
        </p>
      </div>

      {/* Top Filter Bar */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Picker */}
          <div className="flex items-center gap-1.5 min-w-[160px]">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-1.5 min-w-[160px]">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <select
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee or code..."
            className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Status Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          <span className="text-[10px] text-muted-foreground block">Present</span>
          <span className="text-lg font-bold font-mono text-green-600 dark:text-green-400">
            {counts.present || 0}
          </span>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          <span className="text-[10px] text-muted-foreground block">Late</span>
          <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
            {counts.late || 0}
          </span>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          <span className="text-[10px] text-muted-foreground block">Half Day</span>
          <span className="text-lg font-bold font-mono text-purple-600 dark:text-purple-400">
            {counts.half_day || 0}
          </span>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          <span className="text-[10px] text-muted-foreground block">Absent</span>
          <span className="text-lg font-bold font-mono text-destructive">
            {counts.absent || 0}
          </span>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          <span className="text-[10px] text-muted-foreground block">On Leave</span>
          <span className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400">
            {counts.on_leave || 0}
          </span>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          <span className="text-[10px] text-muted-foreground block">Missing Checkout</span>
          <span className="text-lg font-bold font-mono text-orange-600 dark:text-orange-400">
            {counts.missing_checkout || 0}
          </span>
        </div>
      </div>

      {/* Main Board View */}
      {loading ? (
        <Loader className="min-h-[40vh]" />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchBoard} />
      ) : boardData?.employees?.length === 0 ? (
        <EmptyState
          title="No records found"
          description="No active employees match the selected date or search filter."
        />
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden sm:block rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Check In</th>
                  <th className="px-5 py-3.5">Check Out</th>
                  <th className="px-5 py-3.5 text-right">Worked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {boardData.employees.map((row) => (
                  <tr key={row.employee._id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-semibold text-foreground">{row.employee.name}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">{row.employee.employeeCode}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {row.employee.department}
                    </td>
                    <td className="px-5 py-3.5">{getStatusBadge(row.status)}</td>
                    <td className="px-5 py-3.5 font-mono text-foreground">
                      {row.checkInAt
                        ? new Date(row.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-foreground">
                      {row.checkOutAt
                        ? new Date(row.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-medium text-foreground">
                      {row.workedMinutes > 0
                        ? `${Math.floor(row.workedMinutes / 60)}h ${row.workedMinutes % 60}m`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Card View (< 640px / 375px) */}
          <div className="sm:hidden space-y-3">
            {boardData.employees.map((row) => (
              <div key={row.employee._id} className="rounded-2xl border border-border bg-card p-4 space-y-2.5 shadow-sm text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{row.employee.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{row.employee.employeeCode} &bull; {row.employee.department}</p>
                  </div>
                  {getStatusBadge(row.status)}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50 text-[11px] font-mono text-muted-foreground">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider block text-muted-foreground/70">In</span>
                    <span className="font-medium text-foreground">
                      {row.checkInAt ? new Date(row.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider block text-muted-foreground/70">Out</span>
                    <span className="font-medium text-foreground">
                      {row.checkOutAt ? new Date(row.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] uppercase tracking-wider block text-muted-foreground/70">Worked</span>
                    <span className="font-medium text-foreground">
                      {row.workedMinutes > 0 ? `${Math.floor(row.workedMinutes / 60)}h ${row.workedMinutes % 60}m` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border pt-4 px-2 text-xs">
            <span className="text-muted-foreground">
              Page {boardData.pagination.page} of {boardData.pagination.totalPages} ({boardData.pagination.total} employees)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(boardData.pagination.totalPages, p + 1))}
                disabled={page >= boardData.pagination.totalPages}
                className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
