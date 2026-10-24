import { useState, useEffect } from 'react';
import {
  Users, UserMinus, DollarSign, Wallet, TrendingUp, Sparkles,
  Megaphone, ShieldCheck, ChevronRight
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { FilterBar } from './FilterBar';
import { Loader } from '../../components/shared/Loader';

const GENDER_COLORS = ['#3b82f6', '#ec4899', '#a855f7'];

function formatPKR(amount) {
  if (amount === null || amount === undefined) return '—';
  return `PKR ${Number(amount).toLocaleString()}`;
}

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

export function AdminDashboard() {
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
        api.get(`/dashboard/admin?${q.toString()}`),
        api.get('/announcements').catch(() => ({ data: { announcements: [] } })),
      ]);

      setData(dashRes.data);
      setAnnouncements(annRes.data.announcements || []);
    } catch (err) {
      console.error('Failed to load Admin dashboard:', err);
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
  const headcountByDept = data?.headcountByDepartment || [];
  const payrollCostByDept = data?.payrollCostByDepartment || [];
  const genderBreakdown = (data?.genderBreakdown || []).filter((g) => g.count > 0);
  const tenureBreakdown = data?.tenureBreakdown || [];
  const recentAuditLogs = data?.recentAuditLogs || [];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Title & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Executive Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Macro-level organizational metrics, payroll expenditures, and audit oversight.
          </p>
        </div>
      </div>

      <FilterBar filters={filters} onFilterChange={setFilters} showDepartment={true} />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Headcount */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Headcount</span>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-foreground">{kpis.headcount ?? 0}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Active or on probation</p>
          </div>
        </div>

        {/* Attrition YTD */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Attrition YTD</span>
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-500">
              <UserMinus className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-foreground">
              {kpis.attritionYTD !== null && kpis.attritionYTD !== undefined
                ? `${kpis.attritionYTD}%`
                : '—'}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Exits / avg headcount</p>
          </div>
        </div>

        {/* Payroll Cost (Selected Period) */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Payroll (Period)</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-foreground truncate">
              {formatPKR(kpis.payrollCostGross)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Net: {formatPKR(kpis.payrollCostNet)}
            </p>
          </div>
        </div>

        {/* Payroll Cost YTD */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Payroll YTD</span>
            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-500">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-foreground truncate">
              {formatPKR(kpis.payrollCostYtdGross)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Net: {formatPKR(kpis.payrollCostYtdNet)}
            </p>
          </div>
        </div>

        {/* Average Salary */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Average Salary</span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-foreground truncate">
              {formatPKR(kpis.averageSalary)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Mean active gross</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Headcount by Department */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Headcount by Department</h2>
              <p className="text-xs text-muted-foreground">Active workforce distribution</p>
            </div>
          </div>
          <div className="h-64 w-full">
            {headcountByDept.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No active employee distribution data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={headcountByDept} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="departmentName" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(val) => [`${val} employees`, 'Headcount']}
                  />
                  <Bar dataKey="headcount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Payroll Cost by Department */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Payroll Cost by Department (PKR)</h2>
              <p className="text-xs text-muted-foreground">Finalized gross salary spend</p>
            </div>
          </div>
          <div className="h-64 w-full">
            {payrollCostByDept.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No finalized payroll runs for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={payrollCostByDept} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="departmentName" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(val, name, item) => [
                      `PKR ${Number(val).toLocaleString()} (Net: PKR ${Number(item.payload.netAmount || 0).toLocaleString()})`,
                      'Gross Cost',
                    ]}
                  />
                  <Bar dataKey="grossAmount" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Gender Breakdown */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Gender Diversity</h2>
              <p className="text-xs text-muted-foreground">Workforce composition</p>
            </div>
          </div>
          <div className="h-64 w-full">
            {genderBreakdown.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No active employee records
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderBreakdown}
                    dataKey="count"
                    nameKey="gender"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    fontSize={11}
                  >
                    {genderBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(val) => [`${val} employees`, 'Count']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Tenure Distribution */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Tenure Distribution</h2>
              <p className="text-xs text-muted-foreground">Length of service across employees</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tenureBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="bucket" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(val) => [`${val} employees`, 'Count']}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Audit Logs & AI Executive Card & Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Audit Logs */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Latest Audit Logs</h2>
              </div>
              <Link to="/audit" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                View all logs <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              {recentAuditLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No audit activity recorded yet
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="p-3 font-medium">Action</th>
                      <th className="p-3 font-medium">Actor</th>
                      <th className="p-3 font-medium hidden sm:table-cell">Target</th>
                      <th className="p-3 font-medium text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {recentAuditLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-accent/40 transition-colors">
                        <td className="p-3 font-mono font-medium text-foreground">{log.action}</td>
                        <td className="p-3 text-muted-foreground">{log.actorName || log.actorRole}</td>
                        <td className="p-3 text-muted-foreground hidden sm:table-cell">
                          {log.targetModel}
                        </td>
                        <td className="p-3 text-right text-muted-foreground">
                          {new Date(log.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          <div className="p-3 border-t border-border bg-muted/10 text-center">
            <Link to="/audit" className="text-xs font-medium text-primary hover:underline">
              Inspect complete audit trail →
            </Link>
          </div>
        </div>

        {/* Right column: Announcements & AI Briefing */}
        <div className="space-y-6">
          {/* AI Executive Briefing (Coming in Part 6) */}
          <div className="rounded-xl border border-dashed border-primary/40 bg-gradient-to-br from-primary/5 via-card to-background p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">AI Executive Brief</h2>
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Coming in Part 6
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Autonomous organizational analysis: salary equity, headcount forecasting, budget burn rates, and compliance risks.
            </p>
            <button
              disabled
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-muted text-muted-foreground px-4 py-2.5 text-xs font-medium cursor-not-allowed opacity-75"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate Executive Briefing (Part 6)
            </button>
          </div>

          {/* Announcements Card */}
          <div className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" />
                <h2 className="text-xs font-semibold text-foreground">Announcements</h2>
              </div>
              <Link to="/announcements" className="text-xs text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {announcements.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">No announcements</p>
              ) : (
                announcements.slice(0, 2).map((a) => (
                  <div key={a._id} className="rounded-lg border border-border/70 p-2.5 bg-muted/10">
                    <p className="text-xs font-semibold text-foreground truncate">{a.title}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                      {a.body}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
