import { useState, useEffect } from 'react';
import { Megaphone, Pin, PinOff, Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { Loader } from '../../components/shared/Loader';
import { EmptyState } from '../../components/shared/EmptyState';

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const isManager = user?.role === 'admin' || user?.role === 'hr';

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ title: '', body: '', pinned: false });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/announcements');
      setAnnouncements(res.data.announcements || []);
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({ title: '', body: '', pinned: false });
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({ title: item.title, body: item.body, pinned: item.pinned });
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError('Title is required');
      return;
    }
    if (!formData.body.trim()) {
      setFormError('Body is required');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      if (editingItem) {
        await api.put(`/announcements/${editingItem._id}`, formData);
      } else {
        await api.post('/announcements', formData);
      }
      setModalOpen(false);
      fetchAnnouncements();
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to save announcement';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      setAnnouncements((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete announcement');
    }
  };

  const handleTogglePin = async (item) => {
    try {
      const res = await api.patch(`/announcements/${item._id}/pin`);
      setAnnouncements((prev) =>
        prev
          .map((a) => (a._id === item._id ? res.data.announcement : a))
          .sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
          })
      );
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update pin state');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Announcements</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Company-wide updates, news, policies, and notices.
          </p>
        </div>
        {isManager && (
          <button
            id="new-announcement-btn"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Announcement
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <Loader className="py-20" />
      ) : announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements"
          description="There are currently no company announcements posted."
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((item) => (
            <article
              key={item._id}
              className={`rounded-xl border p-5 transition-all shadow-sm ${
                item.pinned
                  ? 'border-amber-500/40 bg-amber-500/5 shadow-amber-500/5 ring-1 ring-amber-500/20'
                  : 'border-border bg-card'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {item.pinned && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        <Pin className="h-3 w-3" /> Pinned
                      </span>
                    )}
                    <h2 className="text-base font-semibold text-foreground tracking-tight">
                      {item.title}
                    </h2>
                  </div>

                  <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {item.body}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                    <span>Posted by</span>
                    <span className="font-medium text-foreground">{item.authorName}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase font-semibold text-muted-foreground">
                      {item.authorRole}
                    </span>
                    <span>•</span>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                </div>

                {isManager && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      title={item.pinned ? 'Unpin announcement' : 'Pin to top'}
                      onClick={() => handleTogglePin(item)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      {item.pinned ? (
                        <PinOff className="h-4 w-4 text-amber-500" />
                      ) : (
                        <Pin className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      title="Edit announcement"
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      title="Delete announcement"
                      onClick={() => handleDelete(item._id)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-semibold text-foreground">
                {editingItem ? 'Edit Announcement' : 'New Announcement'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Office Holiday Notice"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Message / Body <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Type your announcement content here..."
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pinned-checkbox"
                  checked={formData.pinned}
                  onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="pinned-checkbox" className="text-xs font-medium text-foreground">
                  Pin this announcement to the top
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Saving...' : editingItem ? 'Update' : 'Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
