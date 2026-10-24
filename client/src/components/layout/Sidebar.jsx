import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Settings, Building2, Briefcase, CalendarDays, Calendar,
  Users, ClipboardList, Clock, FileText, DollarSign, Bot, X, User, CalendarClock, CreditCard,
  Megaphone, Bell,
} from 'lucide-react';

import { cn } from '../../lib/utils';

const adminLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/settings', label: 'Settings', icon: Settings },
  { divider: true, label: 'Organisation' },
  { to: '/departments', label: 'Departments', icon: Building2 },
  { to: '/designations', label: 'Designations', icon: Briefcase },
  { to: '/leave-types', label: 'Leave Types', icon: CalendarDays },
  { to: '/holidays', label: 'Holidays', icon: Calendar },
  { divider: true, label: 'People' },
  { to: '/users', label: 'HR Users', icon: Users },
  { to: '/employees', label: 'Employees', icon: ClipboardList },
  { divider: true, label: 'Operations' },
  { to: '/attendance/board', label: 'Attendance Board', icon: Clock },
  { to: '/leave/approvals', label: 'Leave Requests', icon: FileText },
  { to: '/payroll/salary', label: 'Salary structures', icon: DollarSign },
  { to: '/payroll/runs', label: 'Payroll', icon: CreditCard },
  { divider: true, label: 'Communications' },
  { to: '/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { divider: true, label: 'Admin' },
  { to: '/audit', label: 'Audit Log', icon: ClipboardList },
  { to: '/ai', label: 'AI Assistant', icon: Bot, isAi: true },
];

const hrLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/settings', label: 'Settings', icon: Settings },
  { divider: true, label: 'Organisation' },
  { to: '/departments', label: 'Departments', icon: Building2 },
  { to: '/designations', label: 'Designations', icon: Briefcase },
  { to: '/leave-types', label: 'Leave Types', icon: CalendarDays },
  { to: '/holidays', label: 'Holidays', icon: Calendar },
  { divider: true, label: 'Operations' },
  { to: '/employees', label: 'Employees', icon: ClipboardList },
  { to: '/attendance/board', label: 'Attendance Board', icon: Clock },
  { to: '/attendance/corrections', label: 'Corrections', icon: CalendarClock },
  { to: '/leave/approvals', label: 'Leave Approvals', icon: FileText },
  { to: '/payroll/salary', label: 'Salary structures', icon: DollarSign },
  { to: '/payroll/runs', label: 'Payroll', icon: CreditCard },
  { divider: true, label: 'Communications' },
  { to: '/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/ai', label: 'AI Assistant', icon: Bot, isAi: true },
];

const employeeLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/employees/me', label: 'My Profile', icon: User },
  { divider: true, label: 'Operations' },
  { to: '/attendance/my', label: 'My Attendance', icon: Clock },
  { to: '/leave/my', label: 'Leave', icon: FileText },
  { to: '/attendance/corrections', label: 'Corrections', icon: CalendarClock },
  { to: '/payroll/my', label: 'My payslips', icon: DollarSign },
  { to: '/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/ai', label: 'AI Assistant', icon: Bot, isAi: true },
];


function getLinksByRole(role) {
  if (role === 'admin') return adminLinks;
  if (role === 'hr') return hrLinks;
  return employeeLinks;
}

export function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const links = getLinksByRole(user?.role);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-full w-64 flex-col bg-sidebar border-r border-sidebar-border flex',
          'transition-transform duration-300 ease-out',
          'md:translate-x-0 md:static md:z-auto',
          open ? 'translate-x-0 animate-slide-in' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">H</span>
            </div>
            <span className="font-bold text-lg text-sidebar-foreground">HCM Lite</span>
          </div>
          <button
            onClick={onClose}
            className="md:hidden rounded p-1 text-sidebar-foreground/60 hover:text-sidebar-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {links.map((link, i) => {
            if (link.divider) {
              return (
                <div key={i} className="pt-4 pb-1 px-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                    {link.label}
                  </p>
                </div>
              );
            }
            if (link.isAi) {
              return (
                <button
                  key={link.to}
                  type="button"
                  onClick={() => {
                    onClose();
                    window.dispatchEvent(new CustomEvent('open-ai-chat'));
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
                >
                  <link.icon className="h-4 w-4 shrink-0 text-primary" />
                  <span>{link.label}</span>
                  <span className="ml-auto text-[10px] font-semibold bg-primary/10 text-primary rounded px-1.5 py-0.5">
                    AI
                  </span>
                </button>
              );
            }
            if (link.soon) {
              return (
                <div
                  key={link.to}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground/40 cursor-not-allowed select-none"
                >
                  <link.icon className="h-4 w-4 shrink-0" />
                  <span className="text-sm">{link.label}</span>
                  <span className="ml-auto text-[10px] font-medium bg-sidebar-foreground/10 rounded px-1.5 py-0.5">
                    Soon
                  </span>
                </div>
              );
            }
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )
                }
              >
                <link.icon className="h-4 w-4 shrink-0" />
                {link.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Role badge */}
        <div className="px-4 py-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xs font-semibold text-primary">
                {user?.name?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.name}</p>
              <p className="text-[10px] text-sidebar-foreground/50 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
