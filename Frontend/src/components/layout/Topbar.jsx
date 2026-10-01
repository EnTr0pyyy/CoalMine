import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Bell, ChevronDown, LogOut, Settings, Megaphone, Landmark } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { roleLabel } from '../../utils/roles.js';
import { departmentLabel } from '../../utils/departments.js';
import { notificationService } from '../../services/notificationService.js';
import { noticeService } from '../../services/noticeService.js';

function initials(name = '') {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [topNotice, setTopNotice] = useState(null);

  useEffect(() => {
    notificationService.getUnreadCount().then(setUnreadCount);
    noticeService.getNotices(user?.department).then((notices) => {
      const active = (notices || []).filter((n) => n.status === 'Active');
      if (active.length > 0) setTopNotice(active[0]);
    });
  }, [location.pathname, user?.department]);

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface-card/95 backdrop-blur-md px-4 sm:px-6">
      <div className="flex items-center gap-3 min-w-0">
        <button
          className="rounded-lg p-2 text-ink-700 hover:bg-surface-sunken lg:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-900 text-white font-bold text-xs shadow-xs">
            CS
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-ink-900 tracking-tight">CoalSetu</span>
              <span className="hidden sm:inline-flex items-center rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium text-brand-800">
                CMPDI · CIL
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-ink-500">
              Ministry of Coal Intelligence Platform
            </p>
          </div>
        </div>

        {/* Top Notice Pill */}
        {topNotice && (
          <Link
            to="/notices"
            className="hidden xl:flex items-center gap-2.5 rounded-full border border-border bg-surface-sunken px-3.5 py-1 text-xs text-ink-700 hover:bg-surface-canvas hover:text-ink-900 hover:border-border-strong transition-all shrink-0 ml-4"
            title={topNotice.title}
          >
            <span className="flex h-2 w-2 rounded-full bg-status-success animate-pulse" />
            <span className="text-[11px] font-semibold text-ink-900">Notice:</span>
            <span className="truncate max-w-[280px] text-ink-700">
              {topNotice.title}
            </span>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Link
          to="/notifications"
          className="relative rounded-lg p-2 text-ink-700 hover:bg-surface-sunken transition"
          aria-label="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-danger px-1 text-[10px] font-semibold text-white">
              {unreadCount}
            </span>
          )}
        </Link>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            aria-label="Account menu"
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-surface-sunken transition"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800">
              {initials(user?.name)}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-xs font-semibold leading-tight text-ink-900">{user?.name}</span>
              <span className="block text-[11px] leading-tight text-ink-500">
                {roleLabel(user?.role)}
                {user?.department && ` · ${departmentLabel(user.department)}`}
              </span>
            </span>
            <ChevronDown size={14} className="hidden text-ink-500 sm:block" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-border bg-surface-card py-1.5 shadow-popover">
                <Link
                  to="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-ink-700 hover:bg-surface-sunken transition"
                >
                  <Settings size={15} />
                  Settings
                </Link>
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-status-danger hover:bg-surface-sunken transition"
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
