import { useState, useEffect } from 'react';
import {
  Clock, Calendar, DollarSign, Megaphone, Sparkles, AlertTriangle,
  ArrowRight, CheckCircle2, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { CheckInWidget } from '../attendance/CheckInWidget';
import { Loader } from '../../components/shared/Loader';

function formatPKR(amount) {
  if (amount === null || amount === undefined) return '—';
  return `PKR ${Number(amount).toLocaleString()}`;
}

export function EmployeeDashboard() {
  const [data, setData] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const [dashRes, annRes] = await Promise.all([
        api.get('/dashboard/employee'),
        api.get('/announcements').catch(() => ({ data: { announcements: [] } })),
      ]);
      setData(dashRes.data);
      setAnnouncements(annRes.data.announcements || []);
    } catch (err) {
      console.error('Failed to load employee dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading && !data) {
    return <Loader className="min-h-[400px]" />;
  }

  const hoursThisWeek = data?.hoursThisWeek || 0;
  const hoursPercent = Math.min(100, Math.round((hoursThisWeek / 40) * 100));
  const lateCountMonth = data?.lateCountMonth || 0;
  const leaveBalances = data?.leaveBalances || [];
  const lastPayslip = data?.lastPayslip;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Employee Portal</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your daily time stamping, weekly progress, leave entitlements, and payslips.
        </p>
      </div>

      {/* 1. Time Check-In Widget */}
      <CheckInWidget onAttendanceUpdated={fetchDashboard} />

      {/* 2. Key Stats Row: Hours this week & Late count */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Hours Worked This Week */}
        <div className="md:col-span-2 rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Hours This Week</h2>
            </div>
            <span className="text-xs font-mono font-bold text-foreground">
              {hoursThisWeek} / 40 hrs ({hoursPercent}%)
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                hoursPercent >= 100
                  ? 'bg-emerald-500'
                  : hoursPercent >= 75
                  ? 'bg-primary'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${hoursPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span>Target: 40 hrs / standard work week</span>
            <Link to="/attendance/my" className="text-primary hover:underline flex items-center gap-0.5">
              Attendance log <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Lateness this month */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Late Arrivals</span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-foreground">{lateCountMonth}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Recorded this month</p>
          </div>
          <div className="pt-2 border-t border-border/50 text-[11px]">
            <Link to="/attendance/corrections" className="text-primary hover:underline">
              Request correction →
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Leave Balances Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Leave Balances</h2>
          </div>
          <Link to="/leave/my" className="text-xs text-primary hover:underline flex items-center gap-0.5">
            Apply or manage leaves <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {leaveBalances.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
            No active leave policies assigned
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {leaveBalances.map((lb) => (
              <div
                key={lb.leaveTypeId}
                className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between space-y-3"
              >
                <div>
                  <h3 className="text-xs font-semibold text-foreground">{lb.name}</h3>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold text-primary">{lb.remaining}</span>
                    <span className="text-xs text-muted-foreground">days left</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                  <span>Quota: {lb.quota}</span>
                  <span>Used: {lb.used}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Bottom Grid: Payslip & Announcements & AI Assistant */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Payslip Card */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <h2 className="text-sm font-semibold text-foreground">Latest Payslip</h2>
              </div>
              <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                Finalized
              </span>
            </div>

            {lastPayslip ? (
              <div className="py-4 space-y-2">
                <div className="text-xs text-muted-foreground">Period: {lastPayslip.month}</div>
                <div className="text-2xl font-bold text-foreground">
                  {formatPKR(lastPayslip.netSalary)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Gross: {formatPKR(lastPayslip.grossSalary)}
                </p>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No finalized payslips available yet
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-border">
            <Link
              to="/payroll/my"
              className="text-xs font-medium text-primary hover:underline flex items-center justify-center gap-1"
            >
              View complete payslip history →
            </Link>
          </div>
        </div>

        {/* Announcements Card */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Announcements</h2>
              </div>
              <Link to="/announcements" className="text-xs text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="py-3 space-y-2.5">
              {announcements.length === 0 ? (
                <div className="text-center py-4 text-xs text-muted-foreground">
                  No announcements posted
                </div>
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
          <div className="pt-2 border-t border-border text-center">
            <Link to="/announcements" className="text-xs font-medium text-primary hover:underline">
              Check all notices →
            </Link>
          </div>
        </div>

        {/* AI Assistant Preview (Part 6) */}
        <div className="rounded-xl border border-dashed border-primary/40 bg-gradient-to-br from-primary/5 via-card to-background p-5 shadow-sm flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">Ask My Assistant</h2>
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Coming in Part 6
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mt-2">
              Ask about your leave eligibility, upcoming holidays, tax deductions, or company policies.
            </p>
          </div>
          <div className="pt-2">
            <div className="flex items-center gap-2">
              <input
                disabled
                placeholder="Ask about leaves, payslips..."
                className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground cursor-not-allowed"
              />
              <button
                disabled
                className="rounded-lg bg-primary/50 px-3 py-2 text-xs font-medium text-primary-foreground cursor-not-allowed"
              >
                Ask
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
