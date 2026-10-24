import { useState, useEffect } from 'react';
import { Bell, CheckCheck, ExternalLink, Megaphone, Calendar, Clock, DollarSign, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Loader } from '../../components/shared/Loader';
import { EmptyState } from '../../components/shared/EmptyState';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (unreadOnly) q.set('unreadOnly', 'true');

      const res = await api.get(`/notifications?${q.toString()}`);
      setNotifications(res.data.notifications || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalCount(res.data.total || 0);
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [page, unreadOnly]);

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      // ignore
    }
  };

  const handleItemClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await api.patch(`/notifications/${notif._id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
      } catch (err) {
        // ignore
      }
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'announcement':
        return <Megaphone className="h-5 w-5 text-amber-500 shrink-0" />;
      case 'leave_request':
      case 'leave_approved':
      case 'leave_rejected':
        return <Calendar className="h-5 w-5 text-blue-500 shrink-0" />;
      case 'correction_request':
      case 'correction_approved':
      case 'correction_rejected':
      case 'attendance':
        return <Clock className="h-5 w-5 text-emerald-500 shrink-0" />;
      case 'payroll':
        return <DollarSign className="h-5 w-5 text-purple-500 shrink-0" />;
      default:
        return <Bell className="h-5 w-5 text-primary shrink-0" />;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Stay updated with alerts, approvals, payroll notices, and announcements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="mark-all-read-page-btn"
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all as read
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => {
            setUnreadOnly(false);
            setPage(1);
          }}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            !unreadOnly
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          All Notifications
        </button>
        <button
          onClick={() => {
            setUnreadOnly(true);
            setPage(1);
          }}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            unreadOnly
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          Unread Only
        </button>
        <span className="text-xs text-muted-foreground ml-auto">
          {totalCount} {totalCount === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <Loader className="py-20" />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={unreadOnly ? 'No unread notifications' : 'No notifications'}
          description={
            unreadOnly
              ? "You're all caught up! There are no unread notifications."
              : 'System updates, leave responses, and announcements will appear here.'
          }
        />
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm divide-y divide-border overflow-hidden">
          {notifications.map((notif) => (
            <div
              key={notif._id}
              onClick={() => handleItemClick(notif)}
              className={`flex items-start gap-4 p-4 transition-colors cursor-pointer hover:bg-accent/40 ${
                !notif.isRead ? 'bg-primary/5' : ''
              }`}
            >
              <div className="mt-1 p-2 rounded-lg bg-background border border-border">
                {getIcon(notif.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={`text-sm text-foreground leading-relaxed ${
                      !notif.isRead ? 'font-semibold' : 'font-normal'
                    }`}
                  >
                    {notif.message}
                  </p>
                  {!notif.isRead && (
                    <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(notif.createdAt)}
                  </span>
                  {notif.link && (
                    <span className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                      Go to page <ExternalLink className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
          >
            Previous
          </button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
