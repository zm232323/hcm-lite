import { useAuth } from '../../context/AuthContext';
import { AdminDashboard } from './AdminDashboard';
import { HrDashboard } from './HrDashboard';
import { EmployeeDashboard } from './EmployeeDashboard';
import { Loader } from '../../components/shared/Loader';

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) {
    return <Loader className="min-h-screen" />;
  }

  if (user.role === 'admin') {
    return <AdminDashboard />;
  }

  if (user.role === 'hr') {
    return <HrDashboard />;
  }

  return <EmployeeDashboard />;
}
