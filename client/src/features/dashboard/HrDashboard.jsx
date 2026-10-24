import { useState, useEffect } from 'react';
import {
  Users, UserCheck, CalendarOff, Clock, AlertCircle, Percent, TrendingUp,
  Megaphone, Sparkles, ChevronRight, ArrowUpRight
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, Legend
} from 'recharts';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { FilterBar } from './FilterBar';
import { Loader } from '../../components/shared/Loader';

function getInitialFilters() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return {
    preset: 'month',
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${day}`,
    departmentId: '',
  };
}

export function HrDashboard() {
  const [filters, setFilters] = useState(getInitialFilters);
  const [data, setData] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (filters.from) q.set('from', filters.from);
      if (filters.to) q.set('to', filters.to);
      if (filters.departmentId) q.set('departmentId', filters.departmentId);

      const [dashRes, annRes] = await Promise.all([
        api.get(`/dashboard/hr?${q.toString()}`),
        api.get('/announcements').catch(() => ({ data: { announcements: [] } })),
      ]);

      setData(dashRes.data);
      setAnnouncements(annRes.data.announcements || []);
    } catch (err) {
      console.error('Failed to load HR dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [filters.from, filters.to, filters.departmentId]);

  if (loading && !data) {
    return <Loader className="min-h-[500px]" />;
  }

  const kpis = data?.kpis || {};
  const attendanceTrend = data?.attendanceTrend || [];
  const absenteeismByDepartment = data?.absenteeismByDepartment || [];
  const leaveByType = data?.leaveByType || [];
  const topLateComers = data?.topLateComers || [];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Title & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">HR Operations Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time workforce attendance, leave utilization, and operational KPIs.
          </p>
        </div>
      </div>

      <FilterBar filters={filters} onFilterChange={setFilters} showDepartment={true} />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Headcount */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Active Headcount</span>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-foreground">{kpis.headcount ?? 0}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Active or on probation</p>
          </div>
        </div>

        {/* Present Today */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Present Today</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {kpis.presentToday ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Checked in today</p>
          </div>
        </div>

        {/* On Leave Today */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">On Leave Today</span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-500">
              <CalendarOff className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {kpis.onLeaveToday ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Approved leave</p>
          </div>
        </div>

        {/* Late Today */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Late Today</span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {kpis.lateToday ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Past check-in threshold</p>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Pending Approvals</span>
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-500">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-foreground">{kpis.pendingApprovals ?? 0}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <Link
                to="/leave/approvals"
                className="text-[11px] text-primary hover:underline flex items-center"
              >
                Review requests <ArrowUpRight className="h-3 w-3 ml-0.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Attendance Rate</span>
            <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-500">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-foreground">
              {kpis.attendanceRate !== null && kpis.attendanceRate !== undefined
                ? `${kpis.attendanceRate}%`
                : '—'}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">In selected period</p>
          </div>
        </div>

        {/* Late % */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Late Rate</span>
            <div className="rounded-lg bg-orange-500/10 p-2 text-orange-500">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-foreground">
              {kpis.latePercent !== null && kpis.latePercent !== undefined
                ? `${kpis.latePercent}%`
                : '—'}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Late / attended days</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend Chart */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Attendance Rate Trend (%)</h2>
              <p className="text-xs text-muted-foreground">Daily attendance rate across working days</p>
            </div>
          </div>
          <div className="h-64 w-full">
            {attendanceTrend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No attendance records in this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickFormatter={(val) => val.slice(5)}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(val) => [`${val ?? 0}%`, 'Attendance Rate']}
                  />
                  <Line
                    type="monotone"
                    dataKey="attendanceRate"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Absenteeism by Department Chart */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Absenteeism Rate by Department (%)</h2>
              <p className="text-xs text-muted-foreground">Unexcused absent days vs expected working days</p>
            </div>
          </div>
          <div className="h-64 w-full">
            {absenteeismByDepartment.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No departmental data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={absenteeismByDepartment}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="departmentName"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(val, name, item) => [
                      `${val ?? 0}% (${item.payload.absentDays} days / ${item.payload.expectedWorkingDays} exp)`,
                      'Absenteeism Rate',
                    ]}
                  />
                  <Bar dataKey="absenteeismRate" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Leave Days by Type */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Approved Leave Days by Type</h2>
              <p className="text-xs text-muted-foreground">Volume of approved leaves taken in period</p>
            </div>
          </div>
          <div className="h-64 w-full">
            {leaveByType.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No leave types defined
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leaveByType} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(val) => [`${val} days`, 'Approved Leave']}
                  />
                  <Bar dataKey="approvedDays" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* AI HR Summary Card (Coming in Part 6) */}
        <div className="rounded-xl border border-dashed border-primary/40 bg-gradient-to-br from-primary/5 via-card to-background p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">AI HR Intelligence</h2>
                  <p className="text-xs text-muted-foreground">Natural language insights & anomalies</p>
                </div>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                Coming in Part 6
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ask questions about attendance patterns, identify teams with rising absenteeism, predict leave crunches, and summarize policy bottlenecks.
            </p>
          </div>
          <div className="pt-4">
            <button
              disabled
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-muted text-muted-foreground px-4 py-2.5 text-xs font-medium cursor-not-allowed opacity-75"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate HR Briefing (Part 6)
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Top Late Comers & Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 5 Late Comers */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20">
            <h2 className="text-sm font-semibold text-foreground">Top Late Comers</h2>
            <p className="text-xs text-muted-foreground">Employees with highest late check-in count in period</p>
          </div>
          <div className="overflow-x-auto">
            {topLateComers.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No late check-ins recorded in this period 🎉
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="p-3 font-medium">Employee</th>
                    <th className="p-3 font-medium">Code</th>
                    <th className="p-3 font-medium hidden sm:table-cell">Department</th>
                    <th className="p-3 font-medium text-right">Late Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {topLateComers.map((emp) => (
                    <tr key={emp.employeeId} className="hover:bg-accent/40 transition-colors">
                      <td className="p-3 font-medium text-foreground">{emp.name}</td>
                      <td className="p-3 text-muted-foreground">{emp.employeeCode}</td>
                      <td className="p-3 text-muted-foreground hidden sm:table-cell">
                        {emp.department}
                      </td>
                      <td className="p-3 text-right">
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                          {emp.lateCount} {emp.lateCount === 1 ? 'time' : 'times'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Latest Announcements */}
        <div className="rounded-xl border border-border bg-card shadow-sm flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Announcements</h2>
              </div>
              <Link
                to="/announcements"
                className="text-xs text-primary hover:underline flex items-center gap-0.5"
              >
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="p-4 space-y-3">
              {announcements.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No active announcements
                </div>
              ) : (
                announcements.slice(0, 3).map((a) => (
                  <div key={a._id} className="rounded-lg border border-border/70 p-3 bg-muted/10 space-y-1">
                    <div className="flex items-center gap-1.5">
                      {a.pinned && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                      )}
                      <h3 className="text-xs font-semibold text-foreground truncate">{a.title}</h3>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {a.body}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="p-3 border-t border-border bg-muted/10 text-center">
            <Link
              to="/announcements"
              className="text-xs font-medium text-primary hover:underline"
            >
              Post or manage announcements →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
