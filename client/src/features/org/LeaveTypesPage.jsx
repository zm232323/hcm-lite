import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { Loader } from '../../components/shared/Loader';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { getErrorMessage } from '../../lib/utils';
import { Plus, Pencil, ToggleLeft, ToggleRight, X, Infinity } from 'lucide-react';

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

export default function LeaveTypesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState({ open: false, item: null });
  const [form, setForm] = useState({ name: '', yearlyQuota: '', isPaid: true });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/org/leave-types').then((r) => setItems(r.data)).catch((e) => setError(getErrorMessage(e))).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm({ name: '', yearlyQuota: '', isPaid: true }); setFormError(''); setModal({ open: true, item: null }); };
  const openEdit = (item) => {
    setForm({ name: item.name, yearlyQuota: item.yearlyQuota ?? '', isPaid: item.isPaid });
    setFormError(''); setModal({ open: true, item });
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setFormError('');
    const payload = {
      name: form.name,
      yearlyQuota: form.yearlyQuota === '' ? null : Number(form.yearlyQuota),
      isPaid: form.isPaid,
    };
    try {
      if (modal.item) await api.put(`/org/leave-types/${modal.item._id}`, payload);
      else await api.post('/org/leave-types', payload);
      setModal({ open: false, item: null }); load();
    } catch (err) { setFormError(getErrorMessage(err)); } finally { setSaving(false); }
  };

  const toggleActive = async (item) => {
    try { await api.put(`/org/leave-types/${item._id}`, { isActive: !item.isActive }); load(); } catch (err) { alert(getErrorMessage(err)); }
  };

  if (loading) return <Loader />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Leave Types</h1>
          <p className="page-subtitle">Configure leave entitlements for your team</p>
        </div>
        {isAdmin && <button id="add-leave-type" onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" />Add Leave Type</button>}
      </div>

      {items.length === 0 ? (
        <EmptyState title="No leave types yet" description="Define annual, sick, casual and other leave types."
          action={isAdmin && <button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" />Add Leave Type</button>} />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Name</th><th>Annual Quota</th><th>Paid</th><th>Status</th>{isAdmin && <th>Actions</th>}</tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td className="font-medium">{item.name}</td>
                  <td>{item.yearlyQuota != null ? `${item.yearlyQuota} days` : <span className="flex items-center gap-1 text-muted-foreground"><Infinity className="h-3.5 w-3.5" /> Unlimited</span>}</td>
                  <td><span className={item.isPaid ? 'badge-active' : 'badge-inactive'}>{item.isPaid ? 'Paid' : 'Unpaid'}</span></td>
                  <td><span className={item.isActive ? 'badge-active' : 'badge-inactive'}>{item.isActive ? 'Active' : 'Inactive'}</span></td>
                  {isAdmin && (
                    <td><div className="flex items-center gap-2">
                      <button onClick={() => openEdit(item)} className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => toggleActive(item)} className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent">
                        {item.isActive ? <ToggleRight className="h-4 w-4 text-green-500" /> : <ToggleLeft className="h-4 w-4" />}
                      </button>
                    </div></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal.open} title={modal.item ? 'Edit Leave Type' : 'Add Leave Type'} onClose={() => setModal({ open: false, item: null })}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="form-label">Name</label>
            <input id="lt-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className="form-input" placeholder="e.g. Annual Leave" />
          </div>
          <div>
            <label className="form-label">Annual Quota (days) <span className="text-muted-foreground font-normal">— leave blank for unlimited</span></label>
            <input id="lt-quota" type="number" min="1" value={form.yearlyQuota} onChange={(e) => setForm((f) => ({ ...f, yearlyQuota: e.target.value }))} className="form-input" placeholder="e.g. 14" />
          </div>
          <div className="flex items-center gap-3">
            <input id="lt-paid" type="checkbox" checked={form.isPaid} onChange={(e) => setForm((f) => ({ ...f, isPaid: e.target.checked }))} className="rounded" />
            <label htmlFor="lt-paid" className="form-label mb-0">Paid leave</label>
          </div>
          {formError && <p className="form-error">{formError}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setModal({ open: false, item: null })} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
