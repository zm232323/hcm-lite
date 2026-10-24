import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  Download,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Building2,
  Briefcase,
  Mail,
  Calendar,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Loader } from '../../components/shared/Loader';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { TempPasswordDialog } from '../../components/shared/TempPasswordDialog';
import { formatDate } from '../../lib/utils';
import { RegisterEmployeeModal } from './RegisterEmployeeModal';
import { EditEmployeeModal } from './EditEmployeeModal';

export default function EmployeesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isHr = user?.role === 'hr';

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [page, setPage] = useState(1);

  // Modals state
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [tempPassword, setTempPassword] = useState('');
  const [tempPasswordModalOpen, setTempPasswordModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Debounce search input (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load departments once
  useEffect(() => {
    api.get('/org/departments')
      .then((res) => setDepartments(res.data || []))
      .catch(() => {});
  }, []);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 10,
        q: debouncedSearch || undefined,
        departmentId: selectedDept || undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
      };
      const res = await api.get('/employees', { params });
      setEmployees(res.data.employees || []);
      setPagination(res.data.pagination || { total: 0, page: 1, limit: 10, pages: 1 });
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, selectedDept, selectedStatus]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const params = {
        q: debouncedSearch || undefined,
        departmentId: selectedDept || undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
      };
      const res = await api.get('/employees/export', {
        params,
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `employees_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export CSV: ' + (err?.response?.data?.error?.message || err.message));
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-[11px] font-medium text-green-500 border border-green-500/20">Active</span>;
      case 'probation':
        return <span className="rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-[11px] font-medium text-yellow-500 border border-yellow-500/20">Probation</span>;
      case 'exited':
        return <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-[11px] font-medium text-destructive border border-destructive/20">Exited</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Employee Directory</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your workforce directory, profile details, and portal accounts
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {isHr && (
            <button
              onClick={handleExportCsv}
              disabled={exporting}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50 shadow-sm"
            >
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
          )}
          {isHr && (
            <button
              onClick={() => setRegisterModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Register Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, employee code, or email..."
            className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 min-w-[150px]">
            <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[130px]">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="probation">Probation</option>
              <option value="exited">Exited</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <Loader className="min-h-[40vh]" />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchEmployees} />
      ) : employees.length === 0 ? (
        <EmptyState
          title="No employees found"
          description={
            searchQuery || selectedDept || selectedStatus !== 'all'
              ? 'Try modifying your search query or filter selection.'
              : isHr
              ? 'Start by registering your first employee.'
              : 'No employee records are available.'
          }
          action={
            isHr && !searchQuery && !selectedDept && selectedStatus === 'all' ? (
              <button
                onClick={() => setRegisterModalOpen(true)}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Register Employee
              </button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View (hidden on mobile < 640px) */}
          <div className="hidden sm:block rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Code</th>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5">Designation</th>
                  <th className="px-5 py-3.5">Joining Date</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {employees.map((emp) => (
                  <tr
                    key={emp._id}
                    onClick={() => navigate(`/employees/${emp._id}`)}
                    className="hover:bg-muted/40 cursor-pointer transition-colors group"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {emp.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {emp.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {emp.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-muted-foreground font-medium">
                      {emp.employeeCode}
                    </td>
                    <td className="px-5 py-3.5 text-foreground font-medium">
                      {emp.departmentId?.name || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {emp.designationId?.title || emp.designationId?.name || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {formatDate(emp.joiningDate)}
                    </td>
                    <td className="px-5 py-3.5">{getStatusBadge(emp.status)}</td>
                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/employees/${emp._id}`)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="View 360 Profile"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {isHr && (
                          <button
                            onClick={() => setEditEmployee(emp)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="Edit Employee"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Card View (shown only on mobile < 640px / 375px) */}
          <div className="sm:hidden space-y-3">
            {employees.map((emp) => (
              <div
                key={emp._id}
                onClick={() => navigate(`/employees/${emp._id}`)}
                className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      {emp.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-foreground">{emp.name}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">{emp.employeeCode}</p>
                    </div>
                  </div>
                  {getStatusBadge(emp.status)}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-border/50 text-muted-foreground">
                  <div className="flex items-center gap-1.5 truncate">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{emp.departmentId?.name || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Briefcase className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{emp.designationId?.title || emp.designationId?.name || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2 truncate">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Joined {formatDate(emp.joiningDate)}
                  </span>
                  <div className="flex items-center gap-2">
                    {isHr && (
                      <button
                        onClick={() => setEditEmployee(emp)}
                        className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/employees/${emp._id}`)}
                      className="rounded-lg bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between border-t border-border pt-4 px-2">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-medium text-foreground">{employees.length}</span> of{' '}
              <span className="font-medium text-foreground">{pagination.total}</span> employees
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-medium text-foreground px-2">
                Page {page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages}
                className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register Employee Modal */}
      {isHr && (
        <RegisterEmployeeModal
          open={registerModalOpen}
          onClose={() => setRegisterModalOpen(false)}
          onSuccess={(data) => {
            setRegisterModalOpen(false);
            fetchEmployees();
            if (data.temporaryPassword) {
              setTempPassword(data.temporaryPassword);
              setTempPasswordModalOpen(true);
            }
          }}
        />
      )}

      {/* Edit Employee Modal */}
      {isHr && (
        <EditEmployeeModal
          open={!!editEmployee}
          employee={editEmployee}
          onClose={() => setEditEmployee(null)}
          onSuccess={() => {
            setEditEmployee(null);
            fetchEmployees();
          }}
        />
      )}

      {/* Temporary Password Dialog */}
      <TempPasswordDialog
        open={tempPasswordModalOpen}
        password={tempPassword}
        onClose={() => {
          setTempPasswordModalOpen(false);
          setTempPassword('');
        }}
      />
    </div>
  );
}
