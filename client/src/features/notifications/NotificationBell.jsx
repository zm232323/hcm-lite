import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, ExternalLink, Megaphone, Calendar, Clock, DollarSign } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../lib/api';

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      // silently ignore
    }
  };

  const fetchLatest = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications?limit=5');
      setNotifications(res.data.notifications || []);
    } catch (err) {
      // silently ignore
    } finally {
      setLoading(false);
    }
  };

  // Poll unread count on mount and every 60s
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

  // Poll unread count on route changes
  useEffect(() => {
    fetchUnreadCount();
  }, [location.pathname]);

  // When dropdown opens, fetch latest notifications
  useEffect(() => {
    if (open) {
      fetchLatest();
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      // ignore
    }
  };

  const handleItemClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await api.patch(`/notifications/${notif._id}/read`);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
      } catch (err) {
        // ignore
      }
    }
    setOpen(false);
    if (notif.link) {
      navigate(notif.link);
    } else {
      navigate('/notifications');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'announcement':
        return <Megaphone className="h-4 w-4 text-amber-500 shrink-0" />;
      case 'leave_request':
      case 'leave_approved':
      case 'leave_rejected':
        return <Calendar className="h-4 w-4 text-blue-500 shrink-0" />;
      case 'correction_request':
      case 'correction_approved':
      case 'correction_rejected':
      case 'attendance':
        return <Clock className="h-4 w-4 text-emerald-500 shrink-0" />;
      case 'payroll':
        return <DollarSign className="h-4 w-4 text-purple-500 shrink-0" />;
      default:
        return <Bell className="h-4 w-4 text-primary shrink-0" />;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        id="notification-bell-btn"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notifications"
        className="relative rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            id="notification-badge"
            className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-sm"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id="notification-dropdown"
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-border bg-card shadow-xl z-50 animate-fade-in overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/30">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                id="mark-all-read-btn"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
            {loading ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n._id}
                  onClick={() => handleItemClick(n)}
                  className={`w-full text-left p-3 flex gap-3 transition-colors hover:bg-accent/60 ${
                    !n.isRead ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="mt-0.5">{getIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs text-foreground line-clamp-2 leading-relaxed ${
                        !n.isRead ? 'font-medium' : 'text-muted-foreground'
                      }`}
                    >
                      {n.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(n.createdAt)}
                      </span>
                      {n.link && (
                        <span className="flex items-center gap-0.5 text-[10px] text-primary">
                          View <ExternalLink className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                  {!n.isRead && (
                    <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border p-2 bg-muted/20 text-center">
            <button
              id="view-all-notifications-btn"
              onClick={() => {
                setOpen(false);
                navigate('/notifications');
              }}
              className="w-full text-xs font-medium text-primary hover:underline py-1"
            >
              View all notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
