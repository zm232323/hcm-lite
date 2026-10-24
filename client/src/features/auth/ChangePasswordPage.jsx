import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { getErrorMessage } from '../../lib/utils';
import { KeyRound } from 'lucide-react';

export default function ChangePasswordPage() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) { setError('Passwords do not match'); return; }
    setSubmitting(true); setError('');
    try {
      await api.post('/auth/change-password', { newPassword: form.newPassword });
      const updated = await refreshUser();
      navigate(updated.role === 'admin' ? '/dashboard' : '/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-amber-500 shadow-lg mb-4">
            <KeyRound className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Change Your Password</h1>
          <p className="text-blue-300 mt-2">Your account requires a new password before you can continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl space-y-5">
          <div>
            <label className="form-label text-white/80">New Password <span className="text-white/40 font-normal">(min 8 characters)</span></label>
            <input id="newPassword" name="newPassword" type="password" required minLength={8}
              value={form.newPassword} onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
              placeholder="Choose a strong password"
              className="form-input bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:ring-blue-400" />
          </div>
          <div>
            <label className="form-label text-white/80">Confirm Password</label>
            <input id="confirmPassword" name="confirm" type="password" required minLength={8}
              value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
              placeholder="Repeat your new password"
              className="form-input bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:ring-blue-400" />
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button id="change-password-submit" type="submit" disabled={submitting}
            className="btn-primary w-full justify-center py-3 text-base">
            {submitting ? 'Saving...' : 'Set New Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
