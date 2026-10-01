import { Landmark, ShieldCheck } from 'lucide-react';
import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-canvas px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-900 text-white font-bold text-base shadow-sm">
            CS
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">
              CoalSetu
            </h1>
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-800">
              AI
            </span>
          </div>
          <p className="mt-1.5 text-xs text-ink-500 max-w-xs leading-relaxed">
            CMPDI · CIL Subsidiaries · Ministry of Coal
          </p>
        </div>
        <Outlet />
        <div className="mt-8 text-center text-xs text-ink-500">
          Statutory Document Processing & Parliamentary Intelligence
        </div>
      </div>
    </div>
  );
}
