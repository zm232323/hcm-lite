import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { Loader } from '../../components/shared/Loader';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { getErrorMessage } from '../../lib/utils';
import {
  DollarSign, Search, Filter, Edit3, X, Check, Building2,
  Briefcase, ArrowUpDown, ChevronLeft, ChevronRight, AlertCircle,
} from 'lucide-react';

export function formatPkr(amount, decimals = 2) {
  const num = Number(amount) || 0;
  return 'PKR ' + num.toLocaleString('en-PK', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default function SalaryStructuresPage() {
  const { user } = useAuth();
  const isHr = user?.role === 'hr';

  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Edit Modal State
  const [editItem, setEditItem] = useState(null);
  const [basic, setBasic] = useState('');
  const [hraPercent, setHraPercent] = useState('40');
  const [medicalPercent, setMedicalPercent] = useState('10');
  const [otherAllowance, setOtherAllowance] = useState('0');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Load Departments
  useEffect(() => {
    api.get('/org/departments')
      .then((res) => setDepartments(res.data.filter((d) => d.isActive)))
      .catch(() => {});
  }, []);

  // Fetch Salary Structures
  const fetchStructures = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10);
      if (search.trim()) params.append('q', search.trim());
      if (departmentId) params.append('departmentId', departmentId);

      const res = await api.get(`/payroll/salary?${params.toString()}`);
      setItems(res.data.items);
      setTotalPages(res.data.pagination.pages);
      setTotal(res.data.pagination.total);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStructures();
  }, [page, departmentId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchStructures();
  };

  // Open Edit Dialog
  const openEditModal = (item) => {
    setEditItem(item);
    setBasic(item.basic !== undefined ? String(item.basic) : '');
    setHraPercent(item.hraPercent !== undefined ? String(item.hraPercent) : '40');
    setMedicalPercent(item.medicalPercent !== undefined ? String(item.medicalPercent) : '10');
    setOtherAllowance(item.otherAllowance !== undefined ? String(item.otherAllowance) : '0');
    setSaveError('');
  };

  // Live Gross Preview Calculations
  const numBasic = parseFloat(basic) || 0;
  const numHraPercent = parseFloat(hraPercent) || 0;
  const numMedicalPercent = parseFloat(medicalPercent) || 0;
  const numOtherAllowance = parseFloat(otherAllowance) || 0;

  const hraAmount = Math.round(((numBasic * numHraPercent) / 100) * 100) / 100;
  const medicalAmount = Math.round(((numBasic * numMedicalPercent) / 100) * 100) / 100;
  const grossPreview = Math.round((numBasic + hraAmount + medicalAmount + numOtherAllowance) * 100) / 100;

  // Handle Save Structure
  const handleSaveStructure = async (e) => {
    e.preventDefault();
    if (!editItem) return;

    if (numBasic <= 0) {
      setSaveError('Basic salary must be greater than 0');
      return;
    }
    if (numHraPercent < 0 || numHraPercent > 100) {
      setSaveError('HRA percentage must be between 0 and 100');
      return;
    }
    if (numMedicalPercent < 0 || numMedicalPercent > 100) {
      setSaveError('Medical percentage must be between 0 and 100');
      return;
    }
    if (numOtherAllowance < 0) {
      setSaveError('Other allowance cannot be negative');
      return;
    }

    try {
      setSaving(true);
      setSaveError('');
      await api.put(`/payroll/salary/${editItem.employeeId}`, {
        basic: numBasic,
        hraPercent: numHraPercent,
        medicalPercent: numMedicalPercent,
        otherAllowance: numOtherAllowance,
      });

      setEditItem(null);
      fetchStructures();
    } catch (err) {
      setSaveError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <DollarSign className="h-7 w-7 text-primary" />
            Salary Structures
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage employee basic salary, allowances, and live gross compensation models.
            {!isHr && ' (Admin Read-Only)'}
          </p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by employee name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </form>

        <div className="flex items-center gap-2">
          <select
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm rounded-xl border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
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

      {/* Content Area */}
      {loading ? (
        <Loader className="py-20" />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchStructures} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No salary records found"
          description={search || departmentId ? 'Try adjusting your search filters' : 'No active employees registered yet'}
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Department / Designation</th>
                    <th className="px-6 py-4 text-right">Basic Salary</th>
                    <th className="px-6 py-4 text-right">HRA</th>
                    <th className="px-6 py-4 text-right">Medical</th>
                    <th className="px-6 py-4 text-right">Other</th>
                    <th className="px-6 py-4 text-right">Gross Salary</th>
                    {isHr && <th className="px-6 py-4 text-center">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {items.map((item) => (
                    <tr key={item.employeeId} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">{item.name}</div>
                        <div className="text-xs font-mono text-muted-foreground">{item.employeeCode}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-medium text-foreground">{item.department}</div>
                        <div className="text-xs text-muted-foreground">{item.designation}</div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium text-foreground">
                        {formatPkr(item.basic)}
                      </td>
                      <td className="px-6 py-4 text-right text-xs">
                        <div className="font-mono text-foreground">{formatPkr((item.basic * item.hraPercent) / 100)}</div>
                        <div className="text-muted-foreground">{item.hraPercent}%</div>
                      </td>
                      <td className="px-6 py-4 text-right text-xs">
                        <div className="font-mono text-foreground">{formatPkr((item.basic * item.medicalPercent) / 100)}</div>
                        <div className="text-muted-foreground">{item.medicalPercent}%</div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-xs text-foreground">
                        {formatPkr(item.otherAllowance)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-primary">
                        {formatPkr(item.gross)}
                      </td>
                      {isHr && (
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => openEditModal(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-xs font-medium text-foreground transition-colors"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View (375px+) */}
          <div className="md:hidden space-y-3">
            {items.map((item) => (
              <div key={item.employeeId} className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-foreground text-sm">{item.name}</h3>
                    <p className="text-xs font-mono text-muted-foreground">{item.employeeCode}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.department} • {item.designation}
                    </p>
                  </div>
                  {isHr && (
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-2 rounded-lg border border-border hover:bg-muted text-foreground transition-colors"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
                  <div>
                    <span className="text-muted-foreground">Basic:</span>
                    <p className="font-mono font-medium text-foreground">{formatPkr(item.basic, 0)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">HRA ({item.hraPercent}%):</span>
                    <p className="font-mono text-foreground">{formatPkr((item.basic * item.hraPercent) / 100, 0)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Medical ({item.medicalPercent}%):</span>
                    <p className="font-mono text-foreground">{formatPkr((item.basic * item.medicalPercent) / 100, 0)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Other:</span>
                    <p className="font-mono text-foreground">{formatPkr(item.otherAllowance, 0)}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Total Gross:</span>
                  <span className="font-mono font-bold text-primary text-sm">{formatPkr(item.gross)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 pt-2 text-xs text-muted-foreground">
              <span>Showing {items.length} of {total} employees</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-border bg-card text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-medium">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-border bg-card text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Salary Structure Dialog (HR Only) */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">Edit Salary Structure</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editItem.name} ({editItem.employeeCode})
                </p>
              </div>
              <button
                onClick={() => setEditItem(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {saveError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStructure} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Basic Monthly Salary (PKR) <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={basic}
                  onChange={(e) => setBasic(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    HRA (% of Basic)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={hraPercent}
                    onChange={(e) => setHraPercent(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="text-[11px] font-mono text-muted-foreground mt-1">
                    = {formatPkr(hraAmount)}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Medical (% of Basic)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={medicalPercent}
                    onChange={(e) => setMedicalPercent(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="text-[11px] font-mono text-muted-foreground mt-1">
                    = {formatPkr(medicalAmount)}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Other Allowance (PKR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={otherAllowance}
                  onChange={(e) => setOtherAllowance(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Live Gross Preview Card */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Computed Gross:</span>
                  <span className="font-mono font-bold text-primary text-base">
                    {formatPkr(grossPreview)}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Formula: Basic ({formatPkr(numBasic)}) + HRA ({formatPkr(hraAmount)}) + Medical ({formatPkr(medicalAmount)}) + Other ({formatPkr(numOtherAllowance)})
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-border hover:bg-muted text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Structure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
