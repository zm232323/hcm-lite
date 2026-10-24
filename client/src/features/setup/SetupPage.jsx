import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { getErrorMessage, getFieldErrors } from '../../lib/utils';
import { Loader } from '../../components/shared/Loader';
import { Building2, User, Mail, Lock, CheckCircle, Plus, Trash2 } from 'lucide-react';

const defaultLeaveTypes = [
  { name: 'Annual Leave', yearlyQuota: 14, isPaid: true },
  { name: 'Sick Leave', yearlyQuota: 8, isPaid: true },
  { name: 'Casual Leave', yearlyQuota: 10, isPaid: true },
  { name: 'Unpaid Leave', yearlyQuota: null, isPaid: false },
];

export default function SetupPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [leaveTypes, setLeaveTypes] = useState(defaultLeaveTypes);
  const [form, setForm] = useState({
    companyName: '', adminName: '', adminEmail: '', adminPassword: '',
  });

  useEffect(() => {
    api.get('/setup/status').then((res) => {
      if (res.data.initialized) navigate('/login', { replace: true });
    }).catch(() => {}).finally(() => setChecking(false));
  }, [navigate]);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setFieldErrors((fe) => ({ ...fe, [e.target.name]: '' }));
    setError('');
  };

  const handleLtChange = (i, field, value) => {
    setLeaveTypes((lt) => lt.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };

  const addLeaveType = () => setLeaveTypes((lt) => [...lt, { name: '', yearlyQuota: null, isPaid: true }]);
  const removeLeaveType = (i) => setLeaveTypes((lt) => lt.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setFieldErrors({});
    try {
      await api.post('/setup', form);
      // Create leave types via org API (admin login required first)
      // We'll let the admin create them from the UI after setup
      navigate('/login', { replace: true, state: { setupDone: true } });
    } catch (err) {
      setError(getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
    } finally {
      setLoading(false);
    }
  };

  if (checking) return <Loader className="min-h-screen" />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary shadow-lg mb-4">
            <span className="text-2xl font-bold text-white">H</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Welcome to HCM Lite</h1>
          <p className="text-blue-300 mt-2">Let's set up your HR system in just a few steps</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl space-y-6">
          {/* Company */}
          <div>
            <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" /> Company
            </h2>
            <div>
              <label className="form-label text-white/80">Company Name</label>
              <input id="companyName" name="companyName" value={form.companyName} onChange={handleChange} required
                placeholder="Acme Corp" className="form-input bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:ring-blue-400" />
              {fieldErrors.companyName && <p className="form-error">{fieldErrors.companyName}</p>}
            </div>
          </div>

          {/* Admin account */}
          <div>
            <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-primary" /> Admin Account
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label text-white/80">Full Name</label>
                <input id="adminName" name="adminName" value={form.adminName} onChange={handleChange} required
                  placeholder="John Smith" className="form-input bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:ring-blue-400" />
                {fieldErrors.adminName && <p className="form-error">{fieldErrors.adminName}</p>}
              </div>
              <div>
                <label className="form-label text-white/80">Email Address</label>
                <input id="adminEmail" name="adminEmail" type="email" value={form.adminEmail} onChange={handleChange} required
                  placeholder="admin@company.com" className="form-input bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:ring-blue-400" />
                {fieldErrors.adminEmail && <p className="form-error">{fieldErrors.adminEmail}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="form-label text-white/80">Password <span className="text-white/40 font-normal">(min 8 characters)</span></label>
                <input id="adminPassword" name="adminPassword" type="password" value={form.adminPassword} onChange={handleChange} required minLength={8}
                  placeholder="••••••••" className="form-input bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:ring-blue-400" />
                {fieldErrors.adminPassword && <p className="form-error">{fieldErrors.adminPassword}</p>}
              </div>
            </div>
          </div>

          {/* Suggested leave types — form values, not auto-seeded */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" /> Suggested Leave Types
              </h2>
              <span className="text-xs text-white/40">Review after setup → org → leave types</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
              <p className="text-xs text-white/50 mb-3">These are pre-filled suggestions. You can add/create them manually from the Leave Types page after setup.</p>
              {leaveTypes.map((lt, i) => (
                <div key={i} className="flex items-center gap-3 flex-wrap">
                  <input value={lt.name} onChange={(e) => handleLtChange(i, 'name', e.target.value)}
                    placeholder="Leave type name" className="form-input flex-1 min-w-32 bg-white/10 border-white/20 text-white placeholder:text-white/30" />
                  <input type="number" value={lt.yearlyQuota ?? ''} onChange={(e) => handleLtChange(i, 'yearlyQuota', e.target.value ? Number(e.target.value) : null)}
                    placeholder="Days (blank=∞)" className="form-input w-28 bg-white/10 border-white/20 text-white placeholder:text-white/30" />
                  <label className="flex items-center gap-1.5 text-xs text-white/60 whitespace-nowrap">
                    <input type="checkbox" checked={lt.isPaid} onChange={(e) => handleLtChange(i, 'isPaid', e.target.checked)} className="rounded" />
                    Paid
                  </label>
                  <button type="button" onClick={() => removeLeaveType(i)} className="text-red-400 hover:text-red-300 p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addLeaveType}
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors mt-2">
                <Plus className="h-3.5 w-3.5" /> Add another
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
            {loading ? 'Setting up...' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  );
}
