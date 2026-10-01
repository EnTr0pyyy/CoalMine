import { Megaphone, Clock, Building, ShieldAlert } from 'lucide-react';
import { formatDate } from '../../utils/format.js';

const PRIORITY_TONE = {
  HIGH: 'bg-red-50 text-red-700 border-red-200',
  MEDIUM: 'bg-amber-50 text-amber-800 border-amber-200',
  LOW: 'bg-slate-100 text-slate-700 border-slate-200',
};

const CATEGORY_TONE = 'bg-brand-50 text-brand-800 border-brand-200';

export default function NoticeCard({ notice }) {
  const expired = notice.status === 'Expired';
  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm ${expired ? 'opacity-60 bg-slate-50' : ''}`}>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            {notice.refNo || notice.id}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {notice.category}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            notice.priority === 'HIGH' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700'
          }`}>
            {notice.priority === 'HIGH' ? 'Critical' : notice.priority}
          </span>
          {expired && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-400">
              Archived
            </span>
          )}
        </div>
      </div>

      <h3 className="text-base font-semibold text-slate-900 leading-snug">
        {notice.title}
      </h3>
      <p className="mt-2 text-xs text-slate-500 leading-relaxed">
        {notice.description}
      </p>

      <div className="mt-5 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
        <span className="font-medium text-slate-600 flex items-center gap-1.5">
          <Building size={13} className="text-slate-400" />
          {notice.authority || 'Ministry of Coal / CIL'}
        </span>
        <div className="flex items-center gap-4">
          <span>Published: {formatDate(notice.publishedDate)}</span>
          <span className="flex items-center gap-1 font-medium text-slate-600">
            <Clock size={12} className="text-slate-400" />
            Due: {formatDate(notice.expiryDate)}
          </span>
        </div>
      </div>
    </div>
  );
}
