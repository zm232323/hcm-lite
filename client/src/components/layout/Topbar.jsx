import { useState } from 'react';
import { Menu, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { NotificationBell } from '../../features/notifications/NotificationBell';

export function Topbar({ onMenuClick, companyName }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur-sm px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          id="sidebar-toggle"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-medium text-muted-foreground hidden sm:block">
          {companyName || 'HCM Lite'}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell />

        <div className="relative">
        <button
          id="user-menu-toggle"
          onClick={() => setDropdownOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-accent transition-colors"
        >
          <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-xs font-semibold text-primary">
              {user?.name?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
          <span className="text-sm font-medium text-foreground hidden sm:block">{user?.name}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>

        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-xl border border-border bg-card shadow-lg p-1 animate-fade-in">
              <div className="px-3 py-2 border-b border-border mb-1">
                <p className="text-xs font-medium text-foreground">{user?.email}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{user?.role}</p>
              </div>
              <button
                id="logout-btn"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
      </div>
    </header>
  );
}
