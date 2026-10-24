import { useState, useEffect } from 'react';
import { X, UserPlus, AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import { getErrorMessage, getFieldErrors } from '../../lib/utils';

export function RegisterEmployeeModal({ open, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    employeeCode: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    gender: 'male',
    departmentId: '',
    designationId: '',
    joiningDate: new Date().toISOString().split('T')[0],
    status: 'active',
    basicSalary: '',
  });

  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingDropdowns, setFetchingDropdowns] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (open) {
      setFetchingDropdowns(true);
      Promise.all([
        api.get('/org/departments').catch(() => ({ data: [] })),
        api.get('/org/designations').catch(() => ({ data: [] })),
      ])
        .then(([deptRes, desigRes]) => {
          const activeDepts = (deptRes.data || []).filter((d) => d.isActive !== false);
          const activeDesigs = (desigRes.data || []).filter((d) => d.isActive !== false);
          setDepartments(activeDepts);
          setDesignations(activeDesigs);
          if (activeDepts.length > 0 && !formData.departmentId) {
            setFormData((prev) => ({ ...prev, departmentId: activeDepts[0]._id }));
          }
          if (activeDesigs.length > 0 && !formData.designationId) {
            setFormData((prev) => ({ ...prev, designationId: activeDesigs[0]._id }));
          }
        })
        .finally(() => setFetchingDropdowns(false));
    }
  }, [open]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setGeneralError('');
    setFieldErrors({});

    try {
      const payload = {
        ...formData,
        basicSalary: Number(formData.basicSalary),
        joiningDate: new Date(formData.joiningDate).toISOString(),
      };
      const res = await api.post('/employees', payload);
      onSuccess(res.data);
    } catch (err) {
      setGeneralError(getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Register New Employee</h2>
              <p className="text-xs text-muted-foreground">Creates employee profile and linked portal login</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {generalError && (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Employee Code <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                name="employeeCode"
                value={formData.employeeCode}
                onChange={handleChange}
                placeholder="e.g. EMP001"
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {fieldErrors.employeeCode && (
                <p className="mt-1 text-xs text-destructive">{fieldErrors.employeeCode}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Full Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Jane Doe"
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {fieldErrors.name && (
                <p className="mt-1 text-xs text-destructive">{fieldErrors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Work Email <span className="text-destructive">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. jane@company.com"
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-destructive">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 555-0199"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Department <span className="text-destructive">*</span>
              </label>
              <select
                name="departmentId"
                value={formData.departmentId}
                onChange={handleChange}
                required
                disabled={fetchingDropdowns || departments.length === 0}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {departments.length === 0 ? (
                  <option value="">No active departments found</option>
                ) : (
                  departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))
                )}
              </select>
              {fieldErrors.departmentId && (
                <p className="mt-1 text-xs text-destructive">{fieldErrors.departmentId}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Designation <span className="text-destructive">*</span>
              </label>
              <select
                name="designationId"
                value={formData.designationId}
                onChange={handleChange}
                required
                disabled={fetchingDropdowns || designations.length === 0}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {designations.length === 0 ? (
                  <option value="">No active designations found</option>
                ) : (
                  designations.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))
                )}
              </select>
              {fieldErrors.designationId && (
                <p className="mt-1 text-xs text-destructive">{fieldErrors.designationId}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Employment Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="active">Active</option>
                <option value="probation">Probation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Joining Date <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                name="joiningDate"
                value={formData.joiningDate}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {fieldErrors.joiningDate && (
                <p className="mt-1 text-xs text-destructive">{fieldErrors.joiningDate}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Basic Monthly Salary <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                name="basicSalary"
                value={formData.basicSalary}
                onChange={handleChange}
                placeholder="e.g. 50000"
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {fieldErrors.basicSalary && (
                <p className="mt-1 text-xs text-destructive">{fieldErrors.basicSalary}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Residential Address</label>
            <textarea
              name="address"
              rows={2}
              value={formData.address}
              onChange={handleChange}
              placeholder="e.g. Apartment 4B, 100 Main Street"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Registering...' : 'Register Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
