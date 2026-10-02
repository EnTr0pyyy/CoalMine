import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader.jsx';
import FilterBar from '../../components/common/FilterBar.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import NoticeCard from '../../components/notices/NoticeCard.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { noticeService } from '../../services/noticeService.js';
import { NOTICE_CATEGORIES } from '../../data/mockData.js';

export default function NoticeBoard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState({ status: 'loading', notices: [], error: null });
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState('');

  async function load() {
    setState({ status: 'loading', notices: [], error: null });
    try {
      const notices = await noticeService.getNotices(user?.department);
      setState({ status: 'success', notices, error: null });
    } catch (err) {
      setState({ status: 'error', notices: [], error: err.message || 'Unable to load the notice board.' });
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.department]);

  const filtered = state.notices.filter((n) => {
    if (category && n.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!n.title.toLowerCase().includes(q) && !n.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      <PageHeader
        title="Official Directives & Notices"
        description="Notifications, DGMS safety directives, and CMPDI technical circulars issued across CIL subsidiaries."
      />

      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: 'Search by reference number, subject, or directive text…' }}
        selects={[{ key: 'category', label: 'All Categories', value: category, onChange: setCategory, options: NOTICE_CATEGORIES.map((c) => ({ value: c, label: c })) }]}
      />

      {state.status === 'loading' && <LoadingState label="Loading notices…" />}
      {state.status === 'error' && <ErrorState message={state.error} onRetry={load} />}
      {state.status === 'success' && filtered.length === 0 && <EmptyState title="No notices found" />}
      {state.status === 'success' && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {filtered.map((n) => (
            <NoticeCard key={n.id} notice={n} />
          ))}
        </div>
      )}
    </div>
  );
}
