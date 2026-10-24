import { useState, useEffect } from 'react';
import { X, Edit3, AlertTriangle, AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import { getErrorMessage, getFieldErrors } from '../../lib/utils';

export function EditEmployeeModal({ open, employee, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    gender: 'other',
    departmentId: '',
    designationId: '',
    status: 'active',
    exitDate: '',
    basicSalary: '',
  });

  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (employee && open) {
      setFormData({
        name: employee.name || '',
        phone: employee.phone || '',
        address: employee.address || '',
        gender: employee.gender || 'other',
        departmentId: employee.departmentId?._id || employee.departmentId || '',
        designationId: employee.designationId?._id || employee.designationId || '',
        status: employee.status || 'active',
        exitDate: employee.exitDate ? new Date(employee.exitDate).toISOString().split('T')[0] : '',
        basicSalary: employee.basicSalary !== undefined ? employee.basicSalary : '',
      });

      Promise.all([
        api.get('/org/departments').catch(() => ({ data: [] })),
        api.get('/org/designations').catch(() => ({ data: [] })),
      ]).then(([deptRes, desigRes]) => {
        setDepartments(deptRes.data || []);
        setDesignations(desigRes.data || []);
      });
    }
  }, [employee, open]);

  if (!open || !employee) return null;

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
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        gender: formData.gender,
        departmentId: formData.departmentId,
        designationId: formData.designationId,
        status: formData.status,
        basicSalary: Number(formData.basicSalary),
      };

      if (formData.status === 'exited') {
        if (!formData.exitDate) {
          setFieldErrors({ exitDate: 'Exit date is required when status is exited' });
          setLoading(false);
          return;
        }
        payload.exitDate = new Date(formData.exitDate).toISOString();
      } else {
        payload.exitDate = null;
      }

      const res = await api.put(`/employees/${employee._id}`, payload);
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
      <div className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Edit Employee: {employee.name}</h2>
              <p className="text-xs text-muted-foreground">{employee.employeeCode} &bull; {employee.email}</p>
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
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {fieldErrors.name && <p className="mt-1 text-xs text-destructive">{fieldErrors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Department</label>
              <select
                name="departmentId"
                value={formData.departmentId}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} {!d.isActive ? '(Inactive)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Designation</label>
              <select
                name="designationId"
                value={formData.designationId}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {designations.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} {!d.isActive ? '(Inactive)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="active">Active</option>
                <option value="probation">Probation</option>
                <option value="exited">Exited</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Basic Monthly Salary</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                name="basicSalary"
                value={formData.basicSalary}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {fieldErrors.basicSalary && (
                <p className="mt-1 text-xs text-destructive">{fieldErrors.basicSalary}</p>
              )}
            </div>
          </div>

          {formData.status === 'exited' && (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 space-y-3">
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 font-medium text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Marking as Exited will immediately disable this employee's portal login.</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Exit Date <span className="text-destructive">*</span>
                </label>
                <input
                  type="date"
                  name="exitDate"
                  value={formData.exitDate}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {fieldErrors.exitDate && (
                  <p className="mt-1 text-xs text-destructive">{fieldErrors.exitDate}</p>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Address</label>
            <textarea
              name="address"
              rows={2}
              value={formData.address}
              onChange={handleChange}
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
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
