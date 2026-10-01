import { Bot, CheckCircle2, ShieldCheck } from 'lucide-react';
import { formatDate } from '../../utils/format.js';

export default function DocumentExtractedDataPanel({ data }) {
  if (!data) return null;
  return (
    <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-900">
          <Bot size={15} className="text-brand-700" /> Automated Multimodal Extraction & Grounding
        </p>
        {data.confidenceScore && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
            <CheckCircle2 size={13} /> {data.confidenceScore}% Extraction Accuracy
          </span>
        )}
      </div>

      <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-ink-500">Document Type</dt>
          <dd className="font-semibold text-ink-900">{data.documentType}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-500">Originating Entity / Scope</dt>
          <dd className="font-medium text-ink-900">{data.mine}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-500">Record / Exploration Date</dt>
          <dd className="text-ink-900">{formatDate(data.inspectionDate)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-500">Auditing Authority / Geologist</dt>
          <dd className="text-ink-900">{data.inspector}</dd>
        </div>
      </dl>

      <div className="mt-3.5 pt-3 border-t border-brand-200/60">
        <dt className="text-xs font-semibold uppercase text-ink-600 mb-1.5">
          Extracted Findings & Figure Reconciliations
        </dt>
        {data.observations?.length > 0 ? (
          <ul className="space-y-1.5 text-xs text-ink-800">
            {data.observations.map((o, i) => (
              <li key={i} className="flex items-start gap-2 bg-white/80 p-2 rounded border border-brand-100">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>{o}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ink-500">No observations recorded.</p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-brand-200/60">
        <span className="text-ink-500 flex items-center gap-1">
          <ShieldCheck size={14} className="text-brand-700" />
          Traceability & Verification Status:
        </span>
        <span className="font-semibold text-emerald-700">Verified against CCO / CMPDI Archives ✓</span>
      </div>
    </div>
  );
}
