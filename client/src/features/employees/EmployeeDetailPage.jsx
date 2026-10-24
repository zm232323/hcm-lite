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
  Lock,
  Download,
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

      {/* Attendance Tab — Live records from summary provider */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          {summary?.attendance?.summary ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
                <div className="rounded-xl border border-border bg-card p-3">
                  <span className="text-[10px] text-muted-foreground block">Present</span>
                  <span className="text-base font-bold font-mono text-green-600 dark:text-green-400">
                    {summary.attendance.summary.present}
                  </span>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <span className="text-[10px] text-muted-foreground block">Late</span>
                  <span className="text-base font-bold font-mono text-amber-600 dark:text-amber-400">
                    {summary.attendance.summary.late}
                  </span>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <span className="text-[10px] text-muted-foreground block">Half Day</span>
                  <span className="text-base font-bold font-mono text-purple-600 dark:text-purple-400">
                    {summary.attendance.summary.half_day}
                  </span>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <span className="text-[10px] text-muted-foreground block">Absent</span>
                  <span className="text-base font-bold font-mono text-destructive">
                    {summary.attendance.summary.absent}
                  </span>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <span className="text-[10px] text-muted-foreground block">On Leave</span>
                  <span className="text-base font-bold font-mono text-blue-600 dark:text-blue-400">
                    {summary.attendance.summary.on_leave}
                  </span>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <span className="text-[10px] text-muted-foreground block">Total Hours</span>
                  <span className="text-base font-bold font-mono text-foreground">
                    {(summary.attendance.summary.totalWorkedMinutes / 60).toFixed(1)}h
                  </span>
                </div>
              </div>

              {/* Attendance days list */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border bg-muted/40 font-semibold text-xs text-foreground">
                  Current Month Punches ({summary.attendance.month})
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-border/60 text-xs">
                  {summary.attendance.days
                    ?.filter((d) => d.status !== 'weekend' && d.status !== 'scheduled')
                    .map((d) => (
                      <div key={d.date} className="flex items-center justify-between p-3 hover:bg-muted/30">
                        <div>
                          <p className="font-medium text-foreground">{formatDate(d.date)}</p>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {d.checkInAt ? `In: ${new Date(d.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'No punch in'}
                            {d.checkOutAt ? ` &bull; Out: ${new Date(d.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="capitalize font-semibold text-[11px] block">{d.status.replace('_', ' ')}</span>
                          {d.workedMinutes > 0 && (
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {Math.floor(d.workedMinutes / 60)}h {d.workedMinutes % 60}m
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-xs text-muted-foreground">
              No attendance records available for this month.
            </div>
          )}
        </div>
      )}

      {/* Leave Tab — Live balances & recent leaves from summary provider */}
      {activeTab === 'leave' && (
        <div className="space-y-4 text-xs">
          {summary?.leave ? (
            <>
              {/* Balances grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {summary.leave.balances?.map((b) => (
                  <div key={b.leaveTypeId} className="rounded-xl border border-border bg-card p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground truncate">{b.name}</span>
                      <span className="text-[10px] text-muted-foreground">{b.isPaid ? 'Paid' : 'Unpaid'}</span>
                    </div>
                    <div className="flex items-baseline justify-between pt-1 border-t border-border/50">
                      <div>
                        <span className="text-lg font-bold font-mono text-primary">
                          {b.quota !== null ? b.remaining : '∞'}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-1">
                          {b.quota !== null ? `/ ${b.quota}d` : 'unlimited'}
                        </span>
                      </div>
                      <div className="text-right text-[10px] font-mono text-muted-foreground">
                        <div>Used: {b.used}d</div>
                        <div>Pending: {b.pending}d</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent applications */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border bg-muted/40 font-semibold text-xs text-foreground">
                  Recent Leave Applications
                </div>
                {summary.leave.recentLeaves?.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">No leave applications found.</div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {summary.leave.recentLeaves?.map((l) => (
                      <div key={l._id} className="flex items-center justify-between p-3 hover:bg-muted/30">
                        <div>
                          <p className="font-semibold text-foreground">{l.leaveTypeId?.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDate(l.startDate)} &rarr; {formatDate(l.endDate)} ({l.days} {l.days === 1 ? 'day' : 'days'})
                          </p>
                        </div>
                        <span className="capitalize font-medium text-[11px] rounded-full px-2.5 py-0.5 bg-muted text-foreground">
                          {l.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground">
              No leave records found.
            </div>
          )}
        </div>
      )}

      {/* Payroll Tab */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">
          {summary?.payroll?.currentStructure || summary?.payroll?.lastPayslip ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Current Salary Structure */}
              {summary?.payroll?.currentStructure && (
                <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-primary" /> Active Salary Structure
                    </h3>
                  </div>
                  <div className="space-y-3 text-xs divide-y divide-border/60">
                    <div className="pt-2 flex justify-between font-mono">
                      <span className="font-sans text-muted-foreground">Basic Monthly Salary</span>
                      <span className="font-medium text-foreground">
                        PKR {Number(summary.payroll.currentStructure.basic || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="pt-2 flex justify-between font-mono">
                      <span className="font-sans text-muted-foreground">
                        HRA ({summary.payroll.currentStructure.hraPercent}%)
                      </span>
                      <span className="text-foreground">
                        PKR {((Number(summary.payroll.currentStructure.basic || 0) * Number(summary.payroll.currentStructure.hraPercent || 0)) / 100).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="pt-2 flex justify-between font-mono">
                      <span className="font-sans text-muted-foreground">
                        Medical ({summary.payroll.currentStructure.medicalPercent}%)
                      </span>
                      <span className="text-foreground">
                        PKR {((Number(summary.payroll.currentStructure.basic || 0) * Number(summary.payroll.currentStructure.medicalPercent || 0)) / 100).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="pt-2 flex justify-between font-mono">
                      <span className="font-sans text-muted-foreground">Other Allowance</span>
                      <span className="text-foreground">
                        PKR {Number(summary.payroll.currentStructure.otherAllowance || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="pt-2.5 flex justify-between items-center font-bold">
                      <span className="font-sans text-muted-foreground">Total Monthly Gross</span>
                      <span className="font-mono text-primary text-sm">
                        PKR {Number(summary.payroll.currentStructure.gross || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Latest Finalized Payslip */}
              {summary?.payroll?.lastPayslip ? (
                <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-emerald-500" /> Latest Finalized Payslip
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      <Lock className="h-3 w-3" />
                      {summary.payroll.lastPayslip.month}
                    </span>
                  </div>

                  <div className="space-y-3 text-xs divide-y divide-border/60 font-mono">
                    <div className="pt-2 flex justify-between">
                      <span className="font-sans text-muted-foreground">Earned Gross</span>
                      <span className="text-foreground">
                        PKR {Number(summary.payroll.lastPayslip.earnedGross || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="pt-2 flex justify-between">
                      <span className="font-sans text-muted-foreground">
                        Deductions ({summary.payroll.lastPayslip.deductionDays} days)
                      </span>
                      <span className="text-amber-600">
                        PKR {Number(summary.payroll.lastPayslip.deduction || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="pt-2 flex justify-between">
                      <span className="font-sans text-muted-foreground">Income Tax</span>
                      <span className="text-rose-600">
                        PKR {Number(summary.payroll.lastPayslip.tax || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="pt-2.5 flex justify-between items-center font-bold">
                      <span className="font-sans text-emerald-700 dark:text-emerald-400">Net Take-Home</span>
                      <span className="text-emerald-600 dark:text-emerald-400 text-sm">
                        PKR {Number(summary.payroll.lastPayslip.netPay || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={async () => {
                        try {
                          const res = await api.get(`/payroll/payslips/${summary.payroll.lastPayslip._id}/pdf`, { responseType: 'blob' });
                          const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
                          const link = document.createElement('a');
                          link.href = url;
                          link.setAttribute('download', `payslip-${summary.payroll.lastPayslip.month}-${employee.employeeCode}.pdf`);
                          document.body.appendChild(link);
                          link.click();
                          link.remove();
                          window.URL.revokeObjectURL(url);
                        } catch (err) {
                          alert('Failed to download PDF: ' + err.message);
                        }
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download Latest Payslip (PDF)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center text-muted-foreground text-xs flex flex-col items-center justify-center">
                  <CreditCard className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p>No finalized payslips generated for this employee yet.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-muted-foreground text-xs">
              No payroll profile or payslips available for this employee.
            </div>
          )}
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
