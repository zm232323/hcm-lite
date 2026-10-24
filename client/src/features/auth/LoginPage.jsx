import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../lib/utils';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const setupDone = location.state?.setupDone;

  useEffect(() => {
    if (!loading && user) {
      if (user.mustChangePassword) navigate('/change-password', { replace: true });
      else navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      const loggedInUser = await login(form.email, form.password);
      if (loggedInUser.mustChangePassword) navigate('/change-password', { replace: true });
      else navigate('/dashboard', { replace: true });
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
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary shadow-lg mb-4">
            <span className="text-2xl font-bold text-white">H</span>
          </div>
          <h1 className="text-3xl font-bold text-white">HCM Lite</h1>
          <p className="text-blue-300 mt-2">Sign in to your account</p>
        </div>

        {setupDone && (
          <div className="mb-4 rounded-xl bg-green-500/10 border border-green-500/30 px-4 py-3 text-sm text-green-300 text-center">
            ✓ Setup complete! Sign in with your admin credentials.
          </div>
        )}

        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl space-y-5">
          <div>
            <label className="form-label text-white/80">Email address</label>
            <input id="email" name="email" type="email" autoComplete="email" required
              value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="you@company.com"
              className="form-input bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:ring-blue-400" />
          </div>
          <div>
            <label className="form-label text-white/80">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required
              value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              className="form-input bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:ring-blue-400" />
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button id="login-submit" type="submit" disabled={submitting}
            className="btn-primary w-full justify-center py-3 text-base">
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>

          <p className="text-center text-xs text-white/30">
            If this is your first login with a temporary password, you'll be asked to change it.
          </p>
        </form>
      </div>
    </div>
  );
}
