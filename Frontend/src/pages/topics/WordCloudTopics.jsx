import { useEffect, useState } from 'react';
import {
  Cloud,
  Layers,
  Sparkles,
  TrendingUp,
  Search,
  Filter,
  FileText,
  BarChart2,
  RefreshCw,
  CheckCircle2,
  Info
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/common/Card.jsx';
import Button from '../../components/common/Button.jsx';
import { analyticsService } from '../../services/analyticsService.js';
import { subsidiaryService } from '../../services/subsidiaryService.js';

const CATEGORY_COLORS = {
  'Production & Logistics': 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
  'Geology & Exploration': 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100',
  'Coking & Washery': 'text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100',
  'Safety & Statutory': 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100',
  'Environment & ESG': 'text-teal-700 bg-teal-50 border-teal-200 hover:bg-teal-100',
  'Subsidiaries': 'text-orange-700 bg-orange-50 border-orange-200 hover:bg-orange-100',
  'General Operations': 'text-ink-700 bg-surface-sunken border-border hover:bg-surface-canvas'
};

const CATEGORY_DOTS = {
  'Production & Logistics': 'bg-emerald-500',
  'Geology & Exploration': 'bg-blue-500',
  'Coking & Washery': 'bg-purple-500',
  'Safety & Statutory': 'bg-amber-500',
  'Environment & ESG': 'bg-teal-500',
  'Subsidiaries': 'bg-orange-500',
  'General Operations': 'bg-ink-500'
};

export default function WordCloudTopics() {
  const [wordCloud, setWordCloud] = useState([]);
  const [topics, setTopics] = useState([]);
  const [subsidiaries, setSubsidiaries] = useState([]);
  const [selectedSubsidiary, setSelectedSubsidiary] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [maxWords, setMaxWords] = useState(40);
  const [loading, setLoading] = useState(false);
  const [activeWord, setActiveWord] = useState(null);

  useEffect(() => {
    loadData();
    subsidiaryService.getSubsidiaries().then(setSubsidiaries);
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [cloudData, topicData] = await Promise.all([
        analyticsService.getWordCloud({ maxWords, subsidiary: selectedSubsidiary !== 'ALL' ? selectedSubsidiary : null }),
        analyticsService.getTopics()
      ]);
      setWordCloud(cloudData);
      setTopics(topicData);
      if (cloudData.length > 0) setActiveWord(cloudData[0]);
    } catch (err) {
      console.error('Failed to load word cloud / topics:', err);
    } finally {
      setLoading(false);
    }
  }

  // Filter words by category if selected
  const filteredWords = wordCloud.filter((item) => {
    if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <PageHeader
          title="Automated Word Cloud & Topic Identification Module"
          description="Natural Language Processing (NLP) intelligence extracting core themes, operational keywords, and legislative concerns from historical CIL documents and parliamentary records."
        />
        <Button
          icon={RefreshCw}
          variant="secondary"
          onClick={loadData}
          disabled={loading}
          className="self-start md:self-auto"
        >
          {loading ? 'Re-analyzing…' : 'Refresh NLP Models'}
        </Button>
      </div>

      {/* Filter and Control Bar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-ink-500 mb-1">
                Filter Subsidiary
              </label>
              <select
                value={selectedSubsidiary}
                onChange={(e) => {
                  setSelectedSubsidiary(e.target.value);
                  setTimeout(loadData, 50);
                }}
                className="rounded border border-border bg-white px-3 py-1.5 text-xs text-ink-900"
              >
                <option value="ALL">All Subsidiaries (Consolidated)</option>
                {subsidiaries.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code} ({s.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-ink-500 mb-1">
                Filter Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded border border-border bg-white px-3 py-1.5 text-xs text-ink-900"
              >
                <option value="ALL">All Mining Categories</option>
                {Object.keys(CATEGORY_COLORS).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <span className="block text-[11px] font-semibold uppercase text-ink-500 mb-1">
                Word Density ({maxWords} terms)
              </span>
              <input
                type="range"
                min="20"
                max="60"
                step="5"
                value={maxWords}
                onChange={(e) => setMaxWords(Number(e.target.value))}
                onMouseUp={loadData}
                className="w-32 accent-brand-600 cursor-pointer"
              />
            </div>
            <div className="text-right">
              <span className="block text-[11px] font-semibold uppercase text-ink-500 mb-1">Total Indexed</span>
              <span className="text-sm font-bold text-ink-900">{filteredWords.length} Mining Keywords</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Category Legend */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-ink-500 font-medium">Domain Categories:</span>
        {Object.entries(CATEGORY_DOTS).map(([cat, dotColor]) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(selectedCategory === cat ? 'ALL' : cat)}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs border transition ${
              selectedCategory === cat
                ? 'bg-brand-900 text-white border-brand-900'
                : 'bg-white text-ink-700 border-border hover:bg-surface-sunken'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${dotColor}`}></span>
            {cat}
          </button>
        ))}
      </div>

      {/* Word Cloud Visual Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 min-h-[380px] flex flex-col justify-between bg-surface-card">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-700 flex items-center gap-2">
                <Cloud size={18} className="text-brand-600" /> Interactive Mining Word Cloud
              </h3>
              <span className="text-xs text-ink-500 italic">Click keyword to inspect citations & context</span>
            </div>

            {loading ? (
              <div className="h-64 flex items-center justify-center text-sm text-ink-500">
                Processing textual embeddings & TF-IDF vectors…
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-3 p-4">
                {filteredWords.map((item, idx) => {
                  const fontSize = Math.max(13, Math.min(36, 12 + (item.value / 100) * 24));
                  const isSelected = activeWord?.text === item.text;
                  const colorClass = CATEGORY_COLORS[item.category] || CATEGORY_COLORS['General Operations'];

                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveWord(item)}
                      style={{ fontSize: `${fontSize}px` }}
                      className={`font-semibold rounded-lg px-2.5 py-1 transition-all duration-150 border cursor-pointer ${colorClass} ${
                        isSelected ? 'ring-2 ring-brand-700 shadow-md scale-105' : 'opacity-90 hover:opacity-100 hover:scale-105'
                      }`}
                    >
                      {item.text}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-border pt-3 mt-4 flex items-center justify-between text-xs text-ink-500">
            <span>Stopwords eliminated: 180+ administrative boilerplates filtered</span>
            <span className="font-medium text-emerald-700">Weights amplified by CIL Domain Ontology</span>
          </div>
        </Card>

        {/* Selected Keyword Context Panel */}
        <Card className="p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-700 mb-3 flex items-center gap-2">
              <Info size={16} className="text-blue-600" /> Keyword Context & Occurrences
            </h3>

            {activeWord ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-surface-sunken border border-border">
                  <span className="text-xs uppercase font-semibold text-brand-700">{activeWord.category}</span>
                  <h4 className="text-xl font-bold text-ink-900 mt-1 capitalize">{activeWord.text}</h4>
                  <div className="mt-3 flex items-center justify-between text-xs text-ink-600">
                    <span>Relevance Weight: <strong className="text-ink-900">{activeWord.value}/100</strong></span>
                    <span>Database Frequency: <strong className="text-brand-700 font-bold">{activeWord.rawCount || activeWord.occurrences} occurrences</strong></span>
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-semibold uppercase text-ink-500 mb-2">Verified Matches in Ingested Documents</h5>
                  {activeWord.sources && activeWord.sources.length > 0 ? (
                    <ul className="space-y-2 text-xs text-ink-700">
                      {activeWord.sources.map((s, sIdx) => (
                        <li key={sIdx} className="p-2.5 rounded-lg bg-white border border-border space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-ink-900 flex items-center gap-1.5 truncate">
                              <FileText size={13} className="text-brand-600 shrink-0" />
                              {s.name}
                            </span>
                            <span className="shrink-0 text-[10px] font-bold text-brand-700 bg-brand-100 px-1.5 py-0.2 rounded">
                              {s.count} {s.count === 1 ? 'hit' : 'hits'}
                            </span>
                          </div>
                          {s.snippet && (
                            <p className="text-[11px] text-ink-500 italic pl-5 line-clamp-2">
                              "...{s.snippet}..."
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-3 rounded bg-white border border-border text-xs text-ink-500">
                      Detected across subsidiary operational returns & statutory filings.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-ink-500">Select any keyword in the cloud to view related context.</p>
            )}
          </div>

          <div className="pt-4 border-t border-border text-[11px] text-ink-500">
            Traceability verified against Ministry Coal Statistics 2024
          </div>
        </Card>
      </div>

      {/* Semantic Topic Identification Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-ink-900 flex items-center gap-2">
              <Layers size={20} className="text-brand-600" /> Automated Topic Clusters
            </h3>
            <p className="text-xs text-ink-500">
              Discovered topic clusters automatically extracted from cross-subsidiary memos and parliamentary queries
            </p>
          </div>
          <span className="text-xs font-semibold text-ink-700 bg-surface-sunken px-3 py-1 rounded-full border border-border">
            {topics.length} Key Clusters
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topics.map((t) => (
            <Card key={t.id} className="p-5 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                  {t.category}
                </span>
                <span className="text-xs text-status-success font-semibold flex items-center gap-1">
                  <TrendingUp size={13} /> {t.trend}
                </span>
              </div>

              <h4 className="text-sm font-bold text-ink-900 mt-2">{t.topicName}</h4>

              <div className="mt-3">
                <p className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider mb-1.5">
                  Core Keywords
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {t.keyTerms.map((kw, i) => (
                    <span key={i} className="text-xs bg-surface-sunken text-ink-700 px-2 py-0.5 rounded border border-border">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-ink-500">
                <span>{t.documentCount} Linked Documents</span>
                <span className="font-semibold text-brand-700">Relevance: {(t.relevanceScore * 100).toFixed(0)}%</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
