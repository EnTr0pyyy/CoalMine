import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import Card from '../../components/common/Card.jsx';
import Button from '../../components/common/Button.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { DEPARTMENTS, DEPARTMENT_ORDER, DEPARTMENT_LABELS } from '../../utils/departments.js';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all';

export default function Login() {
  const { login, isAuthenticating, authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [department, setDepartment] = useState(DEPARTMENTS.SYSTEM);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await login({
        username,
        password,
        loginType: 'department',
        department,
      });
      const redirectTo = location.state?.from?.pathname || '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch {
      // authError is already surfaced from context
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-7 sm:p-8 shadow-xl shadow-slate-200/40">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="department" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Department / Authority
          </label>
          <select
            id="department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all"
          >
            {DEPARTMENT_ORDER.map((d) => (
              <option key={d} value={d}>
                {DEPARTMENT_LABELS[d]}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-slate-400">
            System Department provides CIL Corporate & Ministry intelligence access.
          </p>
        </div>

        <div>
          <label htmlFor="username" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Username
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            placeholder="e.g. officer1"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        {authError && <p className="text-xs font-semibold text-rose-600">{authError}</p>}

        <button
          type="submit"
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-all disabled:opacity-50"
          disabled={isAuthenticating}
        >
          <LogIn size={16} />
          {isAuthenticating ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-center text-xs text-slate-400 pt-1">
          Authorized access for CMPDI, CIL subsidiaries, and Ministry of Coal.
        </p>
      </form>
    </div>
  );
}
