import { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Briefcase,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  DollarSign,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Loader } from '../../components/shared/Loader';
import { ErrorState } from '../../components/shared/ErrorState';
import { formatDate, getErrorMessage } from '../../lib/utils';

export default function MyProfilePage() {
  const { user } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Editable fields
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      // First get directory list (which for employee role returns only self)
      const res = await api.get('/employees');
      const ownRecord = res.data.employees?.[0];
      if (ownRecord) {
        setEmployee(ownRecord);
        setPhone(ownRecord.phone || '');
        setAddress(ownRecord.address || '');
      } else {
        setError('No employee profile linked to your portal user.');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveContact = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg('');
    try {
      const res = await api.patch('/employees/me', { phone, address });
      setEmployee(res.data);
      setSuccessMsg('Contact information updated successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader className="min-h-[60vh]" />;
  if (error && !employee) return <ErrorState message={error} onRetry={fetchProfile} />;
  if (!employee) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          View your employment details and keep your contact information up to date
        </p>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-xs text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Profile Header */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-2xl">
          {employee.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-foreground">{employee.name}</h2>
            <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-[11px] font-medium text-green-500 border border-green-500/20 capitalize">
              {employee.status}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Employee Code: <span className="font-mono font-medium text-foreground">{employee.employeeCode}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Employment Information (Read-only) */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" /> Employment Details
          </h3>
          <div className="space-y-3.5 text-xs divide-y divide-border/60">
            <div className="pt-2 flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Department
              </span>
              <span className="font-medium text-foreground">{employee.departmentId?.name || '—'}</span>
            </div>
            <div className="pt-3 flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5" /> Designation
              </span>
              <span className="font-medium text-foreground">
                {employee.designationId?.title || employee.designationId?.name || '—'}
              </span>
            </div>
            <div className="pt-3 flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Joining Date
              </span>
              <span className="font-medium text-foreground">{formatDate(employee.joiningDate)}</span>
            </div>
            <div className="pt-3 flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Work Email
              </span>
              <span className="font-medium text-foreground">{employee.email}</span>
            </div>
            {employee.basicSalary !== undefined && (
              <div className="pt-3 flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" /> Basic Salary
                </span>
                <span className="font-medium font-mono text-foreground">
                  ${Number(employee.basicSalary).toLocaleString()} / mo
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Contact Information (Editable by Employee) */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Contact Details
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              You can update your personal phone number and residential address anytime.
            </p>
          </div>

          <form onSubmit={handleSaveContact} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Residential Address</label>
              <div className="relative">
                <textarea
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street address, unit, city, postal code"
                  className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{saving ? 'Saving...' : 'Save Contact Details'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
