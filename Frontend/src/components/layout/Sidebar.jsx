import { NavLink, useNavigate } from 'react-router-dom';
import { ShieldCheck, X, LogOut } from 'lucide-react';
import { navForRole } from '../../utils/navigation.js';
import { useAuth } from '../../hooks/useAuth.js';
import { roleLabel } from '../../utils/roles.js';
import { departmentLabel } from '../../utils/departments.js';

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const sections = navForRole(user?.role);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <>
      {/* Mobile scrim */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink-900/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-brand-800/80 bg-brand-900 text-white transition-transform lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-brand-800/80 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-900 font-bold text-xs shadow-xs">
              CS
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-white">CoalSetu</span>
                <span className="rounded bg-brand-700 px-1.5 py-0.2 text-[9px] font-semibold text-brand-100">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-brand-100/70">CMPDI · CIL · Ministry</p>
            </div>
          </div>
          <button className="text-white/60 hover:text-white lg:hidden" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto px-3 pb-4 pt-2">
          {sections.map((section, idx) => (
            <div key={idx} className="mb-3">
              {section.title && (
                <p className="px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
                  {section.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-brand-700 text-white font-semibold shadow-xs'
                            : 'text-white/70 hover:bg-brand-800 hover:text-white'
                        }`
                      }
                    >
                      <item.icon size={15} className="shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-brand-800/80 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-white/70 hover:bg-brand-800 hover:text-white transition"
          >
            <LogOut size={15} />
            Logout
          </button>
          <p className="px-3 pt-2 text-[11px] text-white/40 truncate">
            {user ? roleLabel(user.role) : ''}
            {user?.department && ` · ${departmentLabel(user.department)}`}
          </p>
        </div>
      </aside>
    </>
  );
}
