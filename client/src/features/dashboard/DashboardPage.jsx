import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { Building2, Users, CalendarDays, Clock } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`rounded-xl p-3 ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

const roleLabels = { admin: 'Administrator', hr: 'HR Manager', employee: 'Employee' };
const roleMessages = {
  admin: 'Manage your organisation, users, and system settings from the sidebar.',
  hr: 'Manage employee records, attendance, and leave from the sidebar.',
  employee: 'View your attendance, leave balances, and payroll from the sidebar.',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'hr') {
      api.get('/settings').then((r) => setCompanyName(r.data.companyName)).catch(() => {});
    }
  }, [user]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{companyName || 'Welcome back'}</p>
        </div>
      </div>

      {/* Welcome card */}
      <div className="rounded-2xl bg-gradient-to-r from-primary to-blue-600 p-6 text-white mb-6 shadow-lg">
        <p className="text-blue-100 text-sm font-medium mb-1">{roleLabels[user?.role]}</p>
        <h2 className="text-2xl font-bold mb-2">Good day, {user?.name?.split(' ')[0]} 👋</h2>
        <p className="text-blue-100 text-sm">{roleMessages[user?.role]}</p>
      </div>

      {/* Stats — placeholder counts; real data in later parts */}
      {(user?.role === 'admin' || user?.role === 'hr') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Building2} label="Departments" value="—" color="bg-blue-500" />
          <StatCard icon={Users} label="Employees" value="—" color="bg-violet-500" />
          <StatCard icon={CalendarDays} label="Leave Types" value="—" color="bg-emerald-500" />
          <StatCard icon={Clock} label="Attendance Today" value="—" color="bg-amber-500" />
        </div>
      )}

      <div className="card">
        <h3 className="font-semibold text-foreground mb-2">Getting Started</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {user?.role === 'admin' && (
            <>
              <li>✓ Create departments and designations under <strong className="text-foreground">Organisation</strong></li>
              <li>✓ Configure leave types and public holidays</li>
              <li>✓ Add HR user logins under <strong className="text-foreground">HR Users</strong></li>
              <li>○ Add employees (coming in Part 2)</li>
            </>
          )}
          {user?.role === 'hr' && (
            <>
              <li>✓ Review company settings</li>
              <li>○ Manage employees (coming in Part 2)</li>
              <li>○ Track attendance (coming in Part 3)</li>
            </>
          )}
          {user?.role === 'employee' && (
            <>
              <li>○ View your attendance (coming in Part 3)</li>
              <li>○ Apply for leave (coming in Part 3)</li>
              <li>○ View payslips (coming in Part 4)</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
