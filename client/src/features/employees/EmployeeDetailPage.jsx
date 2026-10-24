import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  User,
  Clock,
  FileText,
  CreditCard,
  Edit,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Loader } from '../../components/shared/Loader';
import { ErrorState } from '../../components/shared/ErrorState';
import { formatDate } from '../../lib/utils';
import { EditEmployeeModal } from './EditEmployeeModal';

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [employee, setEmployee] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [editModalOpen, setEditModalOpen] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/employees/${id}`);
      setEmployee(res.data.employee);
      setSummary(res.data.summary);
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to load employee profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  if (loading) return <Loader className="min-h-[60vh]" />;
  if (error) return <ErrorState message={error} onRetry={fetchProfile} />;
  if (!employee) return null;

  const isHr = user?.role === 'hr';
  const isPrivileged = user?.role === 'admin' || user?.role === 'hr';
  const isSelf = user?.employeeId && user.employeeId.toString() === employee._id.toString();

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-500 border border-green-500/20">Active</span>;
      case 'probation':
        return <span className="rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-500 border border-yellow-500/20">Probation</span>;
      case 'exited':
        return <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive border border-destructive/20">Exited</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Top back button & breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to directory</span>
        </button>
        {isHr && (
          <button
            onClick={() => setEditModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Edit className="h-3.5 w-3.5" />
            <span>Edit Employee</span>
          </button>
        )}
      </div>

      {/* Header Profile Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-2xl shadow-inner">
              {employee.name?.[0]?.toUpperCase() || 'E'}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-foreground">{employee.name}</h1>
                {getStatusBadge(employee.status)}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                <span className="font-mono font-medium text-foreground">{employee.employeeCode}</span>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {employee.departmentId?.name || 'No department'}
                </span>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" />
                  {employee.designationId?.title || employee.designationId?.name || 'No designation'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2 border border-border">
            {employee.userId?.isActive ? (
              <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
                <ShieldCheck className="h-4 w-4" /> Portal Access Active
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-destructive font-medium">
                <ShieldAlert className="h-4 w-4" /> Login Deactivated
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="border-b border-border flex items-center gap-2">
        {[
          { id: 'overview', label: 'Overview', icon: User },
          { id: 'attendance', label: 'Attendance', icon: Clock },
          { id: 'leave', label: 'Leave', icon: FileText },
          { id: 'payroll', label: 'Payroll', icon: CreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Info */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Personal Information
            </h3>
            <div className="space-y-3 text-xs divide-y divide-border/50">
              <div className="pt-2 flex justify-between">
                <span className="text-muted-foreground">Work Email</span>
                <span className="font-medium text-foreground flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  {employee.email}
                </span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-muted-foreground">Phone Number</span>
                <span className="font-medium text-foreground flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  {employee.phone || '—'}
                </span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-muted-foreground">Gender</span>
                <span className="font-medium text-foreground capitalize">{employee.gender || '—'}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-muted-foreground">Address</span>
                <span className="font-medium text-foreground text-right max-w-xs flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {employee.address || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Employment Details */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" /> Employment Details
            </h3>
            <div className="space-y-3 text-xs divide-y divide-border/50">
              <div className="pt-2 flex justify-between">
                <span className="text-muted-foreground">Joining Date</span>
                <span className="font-medium text-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {formatDate(employee.joiningDate)}
                </span>
              </div>
              {employee.status === 'exited' && (
                <div className="pt-2 flex justify-between text-destructive">
                  <span>Exit Date</span>
                  <span className="font-medium">{formatDate(employee.exitDate)}</span>
                </div>
              )}
              <div className="pt-2 flex justify-between">
                <span className="text-muted-foreground">Department</span>
                <span className="font-medium text-foreground">{employee.departmentId?.name || '—'}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-muted-foreground">Designation</span>
                <span className="font-medium text-foreground">
                  {employee.designationId?.title || employee.designationId?.name || '—'}
                </span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium text-foreground capitalize">{employee.status}</span>
              </div>
            </div>
          </div>

          {/* Compensation (Visible only to Admin, HR, or self) */}
          {(isPrivileged || isSelf) && employee.basicSalary !== undefined && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4 md:col-span-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" /> Compensation & Salary
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Basic Monthly Salary</p>
                  <p className="text-lg font-bold text-foreground mt-1 font-mono">
                    ${Number(employee.basicSalary).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Annual Base</p>
                  <p className="text-lg font-bold text-foreground mt-1 font-mono">
                    ${(Number(employee.basicSalary) * 12).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Pay Schedule</p>
                  <p className="text-sm font-medium text-foreground mt-1">Monthly on the 1st</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Attendance Tab Placeholder */}
      {activeTab === 'attendance' && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
            <Clock className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">Attendance Records</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Attendance logging, geolocation verification, and punch records will be available in Part 3.
          </p>
        </div>
      )}

      {/* Leave Tab Placeholder */}
      {activeTab === 'leave' && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">Leave Balances & Requests</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Leave quotas, employee applications, and approval workflows will be available in Part 4.
          </p>
        </div>
      )}

      {/* Payroll Tab Placeholder */}
      {activeTab === 'payroll' && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
            <CreditCard className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">Payroll & Payslips</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Automated payslip generation, deductions, and payment histories will be available in Part 5.
          </p>
        </div>
      )}

      {/* Edit modal */}
      {isHr && (
        <EditEmployeeModal
          open={editModalOpen}
          employee={employee}
          onClose={() => setEditModalOpen(false)}
          onSuccess={(updated) => {
            setEmployee(updated);
            setEditModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
