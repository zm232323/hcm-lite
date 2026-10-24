import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { Loader } from '../../components/shared/Loader';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { getErrorMessage } from '../../lib/utils';
import { Plus, Pencil, ToggleLeft, ToggleRight, X, Building2 } from 'lucide-react';

function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function DepartmentsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState({ open: false, item: null });
  const [form, setForm] = useState({ name: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/org/departments')
      .then((r) => setItems(r.data))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm({ name: '' }); setFormError(''); setModal({ open: true, item: null }); };
  const openEdit = (item) => { setForm({ name: item.name }); setFormError(''); setModal({ open: true, item }); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setFormError('');
    try {
      if (modal.item) {
        await api.put(`/org/departments/${modal.item._id}`, form);
      } else {
        await api.post('/org/departments', form);
      }
      setModal({ open: false, item: null });
      load();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item) => {
    try {
      await api.put(`/org/departments/${item._id}`, { isActive: !item.isActive });
      load();
    } catch (err) { alert(getErrorMessage(err)); }
  };

  if (loading) return <Loader />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="page-subtitle">Manage your organisation's departments</p>
        </div>
        {isAdmin && (
          <button id="add-department" onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" /> Add Department
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState title="No departments yet" description="Create your first department to get started."
          action={isAdmin && <button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" />Add Department</button>} />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Name</th><th>Status</th>{isAdmin && <th>Actions</th>}</tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td className="font-medium">{item.name}</td>
                  <td>
                    <span className={item.isActive ? 'badge-active' : 'badge-inactive'}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(item)} className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => toggleActive(item)} className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title={item.isActive ? 'Deactivate' : 'Activate'}>
                          {item.isActive ? <ToggleRight className="h-4 w-4 text-green-500" /> : <ToggleLeft className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal.open} title={modal.item ? 'Edit Department' : 'Add Department'} onClose={() => setModal({ open: false, item: null })}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="form-label">Department Name</label>
            <input id="dept-name" value={form.name} onChange={(e) => setForm({ name: e.target.value })} required className="form-input" placeholder="e.g. Engineering" />
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
