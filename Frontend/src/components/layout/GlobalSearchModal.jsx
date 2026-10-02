import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, FileText, Flag, AlertTriangle, CheckSquare, MessageSquare, ArrowRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/api.js';

/**
 * CoalSetu — Global Full-Text Search Modal (#5 Integration)
 * Instant multi-table search across Flags, Corrective Actions, Inspections, Notices, Parliamentary Inquiries.
 */
export default function GlobalSearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setTotal(0);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiClient.get(`/search?q=${encodeURIComponent(query)}&limit=12`);
        setResults(data.results || []);
        setTotal(data.total || 0);
      } catch (err) {
        console.warn('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Flag': return <Flag size={14} className="text-red-500" />;
      case 'Corrective Action': return <CheckSquare size={14} className="text-emerald-600" />;
      case 'Inspection': return <AlertTriangle size={14} className="text-amber-500" />;
      case 'Notice': return <FileText size={14} className="text-brand-600" />;
      case 'Parliamentary Inquiry': return <MessageSquare size={14} className="text-purple-600" />;
      default: return <FileText size={14} className="text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 bg-slate-900/60 backdrop-blur-xs px-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Bar Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 bg-slate-50/50">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents, flags, notices, parliamentary inquiries (e.g. SECL, safety, production)..."
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {loading && <Loader2 size={16} className="animate-spin text-brand-600 shrink-0" />}
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Results Container */}
        <div className="overflow-y-auto p-3 flex-1 space-y-1">
          {query.trim().length >= 2 && !loading && results.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-sm">
              No matching governance records found for "<strong className="text-slate-700">{query}</strong>".
            </div>
          )}

          {results.map((r, i) => (
            <Link
              key={i}
              to={r.href}
              onClick={onClose}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-brand-50/60 border border-transparent hover:border-brand-200/60 transition group"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-brand-100 transition shrink-0">
                  {getTypeIcon(r.type)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900 group-hover:text-brand-900 truncate">
                      {r.title || r.issue || r.description || r.inspectionType || r.id}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 group-hover:bg-brand-100 group-hover:text-brand-800 shrink-0">
                      {r.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {r.mineName || r.assignedTo || r.category || 'CMPDI Governance Record'}
                  </p>
                </div>
              </div>
              <ArrowRight size={14} className="text-slate-300 group-hover:text-brand-600 shrink-0 ml-2 group-hover:translate-x-0.5 transition" />
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            {results.length > 0 ? `Showing ${results.length} of ${total} results` : 'PostgreSQL Full-Text Search Enabled'}
          </span>
          <span className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
            Press ESC to close
          </span>
        </div>
      </div>
    </div>
  );
}
