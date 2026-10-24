import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { Loader } from '../../components/shared/Loader';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { getErrorMessage, formatDate } from '../../lib/utils';
import { Plus, Trash2, X, Calendar } from 'lucide-react';

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

export default function HolidaysPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', date: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/org/holidays').then((r) => setItems(r.data)).catch((e) => setError(getErrorMessage(e))).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setFormError('');
    try {
      await api.post('/org/holidays', form);
      setModal(false); setForm({ name: '', date: '' }); load();
    } catch (err) { setFormError(getErrorMessage(err)); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this holiday?')) return;
    try { await api.delete(`/org/holidays/${id}`); load(); } catch (err) { alert(getErrorMessage(err)); }
  };

  if (loading) return <Loader />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Public Holidays</h1>
          <p className="page-subtitle">Company holiday calendar</p>
        </div>
        {isAdmin && <button id="add-holiday" onClick={() => { setForm({ name: '', date: '' }); setFormError(''); setModal(true); }} className="btn-primary"><Plus className="h-4 w-4" />Add Holiday</button>}
      </div>

      {items.length === 0 ? (
        <EmptyState title="No holidays added yet" description="Add public holidays for your team's calendar."
          action={isAdmin && <button onClick={() => setModal(true)} className="btn-primary"><Plus className="h-4 w-4" />Add Holiday</button>} />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Holiday</th><th>Date</th>{isAdmin && <th>Actions</th>}</tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td className="font-medium flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" />{item.name}</td>
                  <td>{formatDate(item.date)}</td>
                  {isAdmin && (
                    <td>
                      <button onClick={() => handleDelete(item._id)} className="rounded p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} title="Add Holiday" onClose={() => setModal(false)}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="form-label">Holiday Name</label>
            <input id="holiday-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className="form-input" placeholder="e.g. New Year's Day" />
          </div>
          <div>
            <label className="form-label">Date</label>
            <input id="holiday-date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required className="form-input" />
          </div>
          {formError && <p className="form-error">{formError}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Add Holiday'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
