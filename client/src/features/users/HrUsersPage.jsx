import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import { Loader } from '../../components/shared/Loader';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { TempPasswordDialog } from '../../components/shared/TempPasswordDialog';
import { getErrorMessage, formatDate } from '../../lib/utils';
import { Plus, ToggleLeft, ToggleRight, KeyRound, X, Users } from 'lucide-react';

function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function HrUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [tempPass, setTempPass] = useState({ open: false, password: '' });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/users?page=${page}&limit=15`)
      .then((r) => { setUsers(r.data.users); setTotalPages(r.data.totalPages); })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true); setFormError('');
    try {
      const res = await api.post('/users', form);
      setModal(false); setForm({ name: '', email: '' });
      setTempPass({ open: true, password: res.data.tempPassword });
      load();
    } catch (err) { setFormError(getErrorMessage(err)); } finally { setSaving(false); }
  };

  const toggleActive = async (u) => {
    const endpoint = u.isActive ? 'deactivate' : 'activate';
    try { await api.patch(`/users/${u._id}/${endpoint}`); load(); } catch (err) { alert(getErrorMessage(err)); }
  };

  const handleResetPassword = async (u) => {
    if (!confirm(`Reset password for ${u.name}?`)) return;
    try {
      const res = await api.post(`/users/${u._id}/reset-password`);
      setTempPass({ open: true, password: res.data.tempPassword });
    } catch (err) { alert(getErrorMessage(err)); }
  };

  if (loading) return <Loader />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">HR Users</h1>
          <p className="page-subtitle">Manage HR login accounts</p>
        </div>
        <button id="add-hr-user" onClick={() => { setForm({ name: '', email: '' }); setFormError(''); setModal(true); }} className="btn-primary">
          <Plus className="h-4 w-4" />Add HR User
        </button>
      </div>

      {users.length === 0 ? (
        <EmptyState title="No HR users yet" description="Create login accounts for your HR staff."
          action={<button onClick={() => setModal(true)} className="btn-primary"><Plus className="h-4 w-4" />Add HR User</button>} />
      ) : (
        <>
          <div className="table-container mb-4">
            <table className="table">
              <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Must Change Pwd</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td className="font-medium">{u.name}</td>
                    <td className="text-muted-foreground">{u.email}</td>
                    <td><span className={u.isActive ? 'badge-active' : 'badge-inactive'}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td>{u.mustChangePassword ? <span className="badge-inactive">Yes</span> : <span className="text-muted-foreground text-xs">No</span>}</td>
                    <td className="text-muted-foreground text-xs">{formatDate(u.createdAt)}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleActive(u)} title={u.isActive ? 'Deactivate' : 'Activate'}
                          className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                          {u.isActive ? <ToggleRight className="h-4 w-4 text-green-500" /> : <ToggleLeft className="h-4 w-4" />}
                        </button>
                        <button onClick={() => handleResetPassword(u)} title="Reset password"
                          className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                          <KeyRound className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary px-3 py-1.5 text-xs">Previous</button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="btn-secondary px-3 py-1.5 text-xs">Next</button>
            </div>
          )}
        </>
      )}

      <Modal open={modal} title="Add HR User" onClose={() => setModal(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="form-label">Full Name</label>
            <input id="hr-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className="form-input" placeholder="Jane Smith" />
          </div>
          <div>
            <label className="form-label">Email Address</label>
            <input id="hr-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required className="form-input" placeholder="hr@company.com" />
          </div>
          <p className="text-xs text-muted-foreground bg-muted rounded-lg p-3">
            A temporary password will be generated. The user must change it on first login.
          </p>
          {formError && <p className="form-error">{formError}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button id="create-hr-submit" type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Create User'}</button>
          </div>
        </form>
      </Modal>

      <TempPasswordDialog open={tempPass.open} password={tempPass.password} onClose={() => setTempPass({ open: false, password: '' })} />
    </div>
  );
}
