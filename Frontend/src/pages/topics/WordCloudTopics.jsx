import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Info,
  X,
  Bot,
  SlidersHorizontal,
  List,
  Tag,
  ArrowRight,
  Bell,
  AlertTriangle,
  Database,
  UploadCloud,
  ExternalLink,
  Loader2,
  Check,
  FileSpreadsheet
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/common/Card.jsx';
import Button from '../../components/common/Button.jsx';
import { analyticsService } from '../../services/analyticsService.js';
import { subsidiaryService } from '../../services/subsidiaryService.js';
import { documentService } from '../../services/documentService.js';

const CATEGORY_COLORS = {
  'Production & Logistics': 'text-emerald-800 bg-emerald-50 border-emerald-300 hover:bg-emerald-100',
  'Geology & Exploration': 'text-blue-800 bg-blue-50 border-blue-300 hover:bg-blue-100',
  'Coking & Washery': 'text-purple-800 bg-purple-50 border-purple-300 hover:bg-purple-100',
  'Safety & Statutory': 'text-amber-800 bg-amber-50 border-amber-300 hover:bg-amber-100',
  'Environment & ESG': 'text-teal-800 bg-teal-50 border-teal-300 hover:bg-teal-100',
  'Subsidiaries': 'text-orange-800 bg-orange-50 border-orange-300 hover:bg-orange-100',
  'General Operations': 'text-ink-800 bg-surface-sunken border-border-strong hover:bg-surface-canvas'
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
  const navigate = useNavigate();
  const [wordCloud, setWordCloud] = useState([]);
  const [topics, setTopics] = useState([]);
  const [subsidiaries, setSubsidiaries] = useState([]);
  const [selectedSubsidiary, setSelectedSubsidiary] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [maxWords, setMaxWords] = useState(45);
  const [loading, setLoading] = useState(false);
  const [activeWord, setActiveWord] = useState(null);
  const [viewMode, setViewMode] = useState('cloud'); // 'cloud' | 'table' | 'topics'

  // Document Upload & Live Ingestion State
  const [showUploadBox, setShowUploadBox] = useState(false);
  const [selectedUploadFile, setSelectedUploadFile] = useState(null);
  const [uploadSubsidiary, setUploadSubsidiary] = useState('SECL');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState(null);
  const [uploadErrorMsg, setUploadErrorMsg] = useState(null);

  const evidenceRef = useRef(null);
  const fileInputRef = useRef(null);

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
      if (cloudData.length > 0 && !activeWord) {
        setActiveWord(cloudData[0]);
      }
    } catch (err) {
      console.error('Failed to load word cloud / topics:', err);
    } finally {
      setLoading(false);
    }
  }

  // Filter words by category and search query
  const filteredWords = useMemo(() => {
    return wordCloud.filter((item) => {
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesText = item.text.toLowerCase().includes(q);
        const matchesCategory = item.category?.toLowerCase().includes(q);
        const matchesSources = item.sources?.some(
          (s) => s.name?.toLowerCase().includes(q) || s.snippet?.toLowerCase().includes(q)
        );
        if (!matchesText && !matchesCategory && !matchesSources) return false;
      }
      return true;
    });
  }, [wordCloud, selectedCategory, searchQuery]);

  // Select a word and optionally scroll down to evidence inspector
  function handleSelectWord(word, shouldScroll = false) {
    setActiveWord(word);
    if (shouldScroll && evidenceRef.current) {
      evidenceRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Handle clickable document redirect
  function handleDocumentRedirect(s) {
    if (!s) return;
    const docId = s.id || '';
    const name = s.name || '';

    // Notice redirect
    if (docId.startsWith('NTC-') || name.startsWith('Notice:')) {
      const cleanTitle = name.replace(/^Notice:\s*/i, '').trim();
      navigate(`/notices?search=${encodeURIComponent(cleanTitle)}`);
      return;
    }

    // Statutory flag redirect
    if (docId.startsWith('F-') || name.startsWith('Statutory Flag')) {
      navigate('/compliance');
      return;
    }

    // Default: Document Repository redirect with document ID to auto-expand
    if (docId) {
      navigate(`/documents?id=${encodeURIComponent(docId)}`);
      return;
    }

    navigate('/documents');
  }

  // Handle direct file upload and re-indexing into word cloud
  async function handleUploadAndIndex() {
    if (!selectedUploadFile) return;
    setIsUploading(true);
    setUploadErrorMsg(null);
    setUploadSuccessMsg(null);

    try {
      const isSheet = selectedUploadFile.name?.toLowerCase().endsWith('.xlsx') || selectedUploadFile.name?.toLowerCase().endsWith('.csv');
      const isPdf = selectedUploadFile.name?.toLowerCase().endsWith('.pdf');

      const uploadedDoc = await documentService.uploadDocument(selectedUploadFile, {
        name: selectedUploadFile.name,
        fileType: isSheet ? 'Spreadsheet' : isPdf ? 'PDF' : 'Document',
        mineId: uploadSubsidiary,
        mineName: `${uploadSubsidiary} Command Operations`,
      });

      // Reload word cloud & topics immediately
      await loadData();

      setUploadSuccessMsg(
        `Document "${selectedUploadFile.name}" successfully ingested! Extracted terminology and tables are now fully indexed in the Word Cloud and Evidence Inspector.`
      );
      setSelectedUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Set search query to the file base name to highlight its extracted items
      const baseName = selectedUploadFile.name.replace(/\.[^/.]+$/, '').slice(0, 15);
      setSearchQuery(baseName);
    } catch (err) {
      setUploadErrorMsg(err.message || 'Failed to upload and index document.');
    } finally {
      setIsUploading(false);
    }
  }

  // Helper to render highlighted snippet text
  function renderHighlightedSnippet(text, term) {
    if (!text) return null;
    if (!term) return text;
    const parts = text.split(new RegExp(`(${term})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === term.toLowerCase() ? (
        <mark key={i} className="bg-amber-200 text-amber-950 font-bold px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <PageHeader
          title="Automated Word Cloud & Topic Identification"
          description="Natural Language Processing (NLP) intelligence extracting statutory terminology, operational themes, and legislative inquiries directly from historical CIL documents and parliamentary gazettes."
        />
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <Button
            icon={UploadCloud}
            variant="secondary"
            onClick={() => setShowUploadBox((v) => !v)}
            className="border-brand-300 text-brand-700 bg-brand-50 hover:bg-brand-100"
          >
            {showUploadBox ? 'Hide Upload Panel' : 'Upload Document to Index'}
          </Button>
          <Button
            icon={RefreshCw}
            variant="secondary"
            onClick={loadData}
            disabled={loading}
          >
            {loading ? 'Re-analyzing…' : 'Refresh NLP Models'}
          </Button>
          <Button
            icon={Bot}
            variant="primary"
            onClick={() => navigate('/copilot')}
          >
            Ask AI Copilot
          </Button>
        </div>
      </div>

      {/* Direct Ingestion / Upload Box (Collapsible) */}
      {showUploadBox && (
        <Card className="p-6 border-2 border-brand-400 bg-gradient-to-r from-brand-50/70 via-white to-brand-50/50 shadow-md">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
                  <UploadCloud size={20} className="text-brand-600" />
                  Upload & Index Document into Word Cloud Corpus
                </h3>
                <p className="text-xs text-ink-600 mt-0.5">
                  Upload any geological report, production spreadsheet (.csv/.xlsx), or parliamentary brief. The multimodal pipeline extracts terminology, observations, and data tables to make them instantly searchable.
                </p>
              </div>
              <button
                onClick={() => setShowUploadBox(false)}
                className="text-ink-400 hover:text-ink-700 p-1 rounded"
              >
                <X size={18} />
              </button>
            </div>

            {uploadSuccessMsg && (
              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{uploadSuccessMsg}</span>
              </div>
            )}

            {uploadErrorMsg && (
              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                <span>{uploadErrorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-600">
                  Select Source Document (PDF, XLSX, CSV, TXT, DOCX)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.xlsx,.xls,.csv,.tsv,.txt,.doc,.docx"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setSelectedUploadFile(e.target.files[0]);
                    }}
                    className="block w-full text-xs text-ink-600 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-brand-600 file:text-white hover:file:bg-brand-700 file:cursor-pointer rounded-lg border border-border bg-white px-3 py-1.5 cursor-pointer shadow-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-600">
                  Target Subsidiary Command
                </label>
                <select
                  value={uploadSubsidiary}
                  onChange={(e) => setUploadSubsidiary(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-ink-900 shadow-xs focus:border-brand-600 focus:outline-none"
                >
                  <option value="CIL">CIL Corporate</option>
                  <option value="MCL">MCL (Mahanadi)</option>
                  <option value="SECL">SECL (South Eastern)</option>
                  <option value="BCCL">BCCL (Bharat Coking)</option>
                  <option value="CCL">CCL (Central)</option>
                  <option value="CMPDI">CMPDI (Exploration & Design)</option>
                  <option value="WCL">WCL (Western)</option>
                  <option value="ECL">ECL (Eastern)</option>
                  <option value="NCL">NCL (Northern)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-brand-200/60">
              <span className="text-[11px] text-ink-500">
                {selectedUploadFile
                  ? `Selected: ${selectedUploadFile.name} (${(selectedUploadFile.size / 1024).toFixed(1)} KB)`
                  : 'Supported formats: .pdf, .xlsx, .csv, .txt up to 25 MB'}
              </span>
              <Button
                variant="primary"
                icon={isUploading ? Loader2 : UploadCloud}
                onClick={handleUploadAndIndex}
                disabled={isUploading || !selectedUploadFile}
              >
                {isUploading ? 'Extracting & Indexing Corpus…' : 'Start AI Ingestion & Re-Index'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Top Intelligence KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-brand-600 bg-surface-card">
          <div className="flex items-center justify-between text-xs text-ink-500 font-medium mb-1">
            <span>ACTIVE KEYWORD</span>
            <Tag size={15} className="text-brand-600" />
          </div>
          <div className="text-lg font-bold text-ink-900 truncate capitalize">
            {activeWord ? activeWord.text : 'None Selected'}
          </div>
          <p className="text-[11px] text-ink-500 mt-1">
            {activeWord ? `${activeWord.category} · Score ${activeWord.value}/100` : 'Click any keyword to inspect'}
          </p>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-600 bg-surface-card">
          <div className="flex items-center justify-between text-xs text-ink-500 font-medium mb-1">
            <span>INDEXED VOCABULARY</span>
            <BarChart2 size={15} className="text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-ink-900">
            {filteredWords.length} <span className="text-xs font-normal text-ink-500">/ {wordCloud.length} terms</span>
          </div>
          <p className="text-[11px] text-ink-500 mt-1">
            Amplified by CIL Mining Ontology
          </p>
        </Card>

        <Card className="p-4 border-l-4 border-l-purple-600 bg-surface-card">
          <div className="flex items-center justify-between text-xs text-ink-500 font-medium mb-1">
            <span>DISCOVERED CLUSTERS</span>
            <Layers size={15} className="text-purple-600" />
          </div>
          <div className="text-lg font-bold text-ink-900">
            {topics.length} Thematic Groups
          </div>
          <p className="text-[11px] text-ink-500 mt-1">
            Synthesized across parliamentary files
          </p>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-600 bg-surface-card">
          <div className="flex items-center justify-between text-xs text-ink-500 font-medium mb-1">
            <span>NLP FILTERING PIPELINE</span>
            <Sparkles size={15} className="text-blue-600" />
          </div>
          <div className="text-lg font-bold text-ink-900">
            180+ Boilerplates
          </div>
          <p className="text-[11px] text-ink-500 mt-1">
            Administrative noise removed via TF-IDF
          </p>
        </Card>
      </div>

      {/* Main Omnisearch & Filter Control Console */}
      <Card className="p-5 shadow-sm bg-white">
        <div className="space-y-4">
          {/* Prominent Center Search Bar */}
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search mining keywords, statutory themes, borehole logs, equipment, or document excerpts (e.g. OBR, stripping ratio, dragline, DGMS)..."
              className="w-full rounded-lg border-2 border-border-strong bg-surface-canvas py-3 pl-11 pr-10 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:bg-white focus:outline-none transition shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-1 text-ink-400 hover:text-ink-700 hover:bg-surface-sunken"
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Controls: Subsidiary, Density, and View Mode */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-t border-border">
            {/* Left: Dropdowns & Density */}
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-500 mb-1">
                  Subsidiary Scope
                </label>
                <select
                  value={selectedSubsidiary}
                  onChange={(e) => {
                    setSelectedSubsidiary(e.target.value);
                    setTimeout(loadData, 50);
                  }}
                  className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink-900 shadow-sm focus:border-brand-600 focus:outline-none"
                >
                  <option value="ALL">All Subsidiaries (Consolidated CIL)</option>
                  {subsidiaries.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-500 mb-1">
                  Word Density ({maxWords} terms)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="20"
                    max="60"
                    step="5"
                    value={maxWords}
                    onChange={(e) => setMaxWords(Number(e.target.value))}
                    onMouseUp={loadData}
                    className="w-28 accent-brand-600 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-ink-700">{maxWords}</span>
                </div>
              </div>
            </div>

            {/* Right: View Mode Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500 mr-1">
                View Layout:
              </span>
              <div className="inline-flex rounded-lg border border-border bg-surface-sunken p-1 text-xs">
                <button
                  onClick={() => setViewMode('cloud')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition ${
                    viewMode === 'cloud'
                      ? 'bg-white text-brand-700 shadow-xs'
                      : 'text-ink-600 hover:text-ink-900'
                  }`}
                >
                  <Cloud size={14} /> Word Cloud Canvas
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition ${
                    viewMode === 'table'
                      ? 'bg-white text-brand-700 shadow-xs'
                      : 'text-ink-600 hover:text-ink-900'
                  }`}
                >
                  <List size={14} /> Ranking Matrix
                </button>
                <button
                  onClick={() => setViewMode('topics')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition ${
                    viewMode === 'topics'
                      ? 'bg-white text-brand-700 shadow-xs'
                      : 'text-ink-600 hover:text-ink-900'
                  }`}
                >
                  <Layers size={14} /> Topic Clusters
                </button>
              </div>
            </div>
          </div>

          {/* Category Chips Bar */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2">
            <span className="text-xs font-semibold text-ink-500 mr-1">Domain Categories:</span>
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition ${
                selectedCategory === 'ALL'
                  ? 'bg-ink-900 text-white border-ink-900 shadow-xs'
                  : 'bg-white text-ink-700 border-border hover:bg-surface-sunken'
              }`}
            >
              All Categories ({wordCloud.length})
            </button>
            {Object.entries(CATEGORY_DOTS).map(([cat, dotColor]) => {
              const count = wordCloud.filter((w) => w.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? 'ALL' : cat)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition ${
                    selectedCategory === cat
                      ? 'bg-brand-900 text-white border-brand-900 shadow-xs'
                      : 'bg-white text-ink-700 border-border hover:bg-surface-sunken'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${dotColor}`}></span>
                  {cat} {count > 0 && <span className="opacity-70 text-[10px]">({count})</span>}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Main Content Area based on View Mode */}
      {viewMode === 'cloud' && (
        <Card className="p-6 bg-surface-card border-border shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Cloud size={18} className="text-brand-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-ink-800">
                Interactive Mining Lexical Cloud
              </h3>
              <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700 border border-brand-200">
                {filteredWords.length} Active Keywords
              </span>
            </div>
            <span className="text-xs text-ink-500 italic">
              Click any keyword to inspect matching documents & textual evidence below
            </span>
          </div>

          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-sm text-ink-500">
              <RefreshCw size={24} className="animate-spin text-brand-600" />
              <span>Calculating TF-IDF weights and parsing textual embeddings…</span>
            </div>
          ) : filteredWords.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-ink-500">
              <Search size={24} className="text-ink-400" />
              <p className="text-sm">No mining keywords match the current filter or search criteria.</p>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                }}
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-3.5 p-6 min-h-[300px] rounded-xl bg-gradient-to-b from-surface-canvas/50 to-surface-sunken/40 border border-border/60">
              {filteredWords.map((item, idx) => {
                const fontSize = Math.max(13, Math.min(32, 13 + (item.value / 100) * 19));
                const isSelected = activeWord?.text === item.text;
                const colorClass = CATEGORY_COLORS[item.category] || CATEGORY_COLORS['General Operations'];

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectWord(item, true)}
                    style={{ fontSize: `${fontSize}px` }}
                    className={`font-semibold rounded-xl px-3 py-1.5 transition-all duration-200 border cursor-pointer inline-flex items-center gap-1.5 shadow-2xs ${colorClass} ${
                      isSelected
                        ? 'ring-3 ring-brand-600 ring-offset-2 scale-105 shadow-md z-10'
                        : 'opacity-90 hover:opacity-100 hover:scale-105'
                    }`}
                  >
                    <span>{item.text}</span>
                    <span className="text-[10px] font-bold opacity-60 bg-black/5 px-1.5 py-0.5 rounded-full">
                      {item.rawCount || item.occurrences}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="border-t border-border pt-3 mt-5 flex flex-wrap items-center justify-between text-xs text-ink-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-600" />
              Stopwords eliminated: 180+ administrative and formatting boilerplates filtered
            </span>
            <span className="font-semibold text-brand-700">
              Weights dynamically calibrated across CIL Database Records
            </span>
          </div>
        </Card>
      )}

      {viewMode === 'table' && (
        <Card className="overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border bg-surface-canvas flex items-center justify-between">
            <div className="flex items-center gap-2">
              <List size={16} className="text-brand-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-ink-900">
                Keyword Frequency & TF-IDF Ranking Matrix
              </h3>
            </div>
            <span className="text-xs text-ink-500 font-medium">
              Showing {filteredWords.length} sorted mining terms
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-sunken text-ink-600 uppercase font-semibold border-b border-border">
                <tr>
                  <th className="py-2.5 px-4 w-12 text-center">#</th>
                  <th className="py-2.5 px-4">Keyword / Concept</th>
                  <th className="py-2.5 px-4">Domain Category</th>
                  <th className="py-2.5 px-4 text-center">Frequency</th>
                  <th className="py-2.5 px-4 w-44">Relevance Score</th>
                  <th className="py-2.5 px-4 text-center">Citations</th>
                  <th className="py-2.5 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredWords.map((item, idx) => {
                  const isSelected = activeWord?.text === item.text;
                  return (
                    <tr
                      key={idx}
                      onClick={() => handleSelectWord(item, true)}
                      className={`cursor-pointer transition hover:bg-brand-50/40 ${
                        isSelected ? 'bg-brand-50/70 font-semibold' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center text-ink-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 text-ink-900 text-sm font-bold capitalize">
                        {item.text}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface-sunken px-2.5 py-0.5 text-[11px] text-ink-700 border border-border">
                          <span className={`h-1.5 w-1.5 rounded-full ${CATEGORY_DOTS[item.category] || 'bg-ink-400'}`}></span>
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-brand-700">
                        {item.rawCount || item.occurrences} hits
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-surface-sunken rounded-full h-2 overflow-hidden border border-border">
                            <div
                              className="bg-brand-600 h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, item.value)}%` }}
                            />
                          </div>
                          <span className="font-mono text-ink-700 text-[11px] w-8">
                            {item.value}/100
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="rounded bg-brand-100/60 px-2 py-0.5 text-brand-800 font-semibold text-[11px]">
                          {item.sources?.length || 0} files
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectWord(item, true);
                          }}
                          className="inline-flex items-center gap-1 text-brand-700 font-semibold hover:text-brand-900 text-xs"
                        >
                          Evidence <ArrowRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* FULL-WIDTH DEDICATED SEARCH & EVIDENCE INSPECTOR WITH CLICKABLE REDIRECTS */}
      <div ref={evidenceRef} className="scroll-mt-4">
        <Card className="p-6 border-2 border-brand-200/80 shadow-md bg-white">
          <div className="space-y-6">
            {/* Inspector Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-border">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-bold tracking-wider text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded border border-brand-200">
                    {activeWord?.category || 'Corpus Keyword'}
                  </span>
                  <span className="text-xs text-ink-500 font-medium">
                    Verified Ground-Truth Document Evidence (Click Document to Open & View Extracted Figures)
                  </span>
                </div>
                <h2 className="text-2xl font-black text-ink-900 capitalize tracking-tight flex items-center gap-2">
                  {activeWord?.text || searchQuery || 'No Term Selected'}
                </h2>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Bot}
                  onClick={() => navigate('/copilot')}
                >
                  Analyze in Copilot
                </Button>
                {searchQuery && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={X}
                    onClick={() => setSearchQuery('')}
                  >
                    Clear Filter
                  </Button>
                )}
              </div>
            </div>

            {/* Keyword Metrics Strip */}
            {activeWord ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-surface-canvas border border-border">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
                    Relevance & Weight
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-ink-900">{activeWord.value} / 100</span>
                    <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      High Impact
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
                    Total Database Occurrences
                  </span>
                  <div className="text-xl font-bold text-brand-700">
                    {activeWord.rawCount || activeWord.occurrences || 1} hits
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
                    Linked Statutory Documents
                  </span>
                  <div className="text-xl font-bold text-ink-900">
                    {activeWord.sources?.length || 0} references
                  </div>
                </div>
              </div>
            ) : null}

            {/* Verified Document Citations & Match Excerpts (CLICKABLE REDIRECTS) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-600 flex items-center gap-1.5">
                  <Database size={14} className="text-brand-600" />
                  Matching Documents & Contextual Excerpts (Click to Open)
                </h4>
                <span className="text-xs text-ink-500 font-medium">
                  {activeWord?.sources?.length || 0} citations detected
                </span>
              </div>

              {activeWord?.sources && activeWord.sources.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeWord.sources.map((s, sIdx) => {
                    const isNotice = s.name?.startsWith('Notice:');
                    const isFlag = s.name?.startsWith('Statutory Flag');
                    const isDoc = !isNotice && !isFlag;

                    return (
                      <div
                        key={sIdx}
                        onClick={() => handleDocumentRedirect(s)}
                        className="rounded-xl border border-border bg-white p-4 space-y-3 hover:border-brand-500 hover:ring-2 hover:ring-brand-200/80 hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
                        title="Click to view full record and extracted figures"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {isNotice ? (
                                <span className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
                                  <Bell size={18} />
                                </span>
                              ) : isFlag ? (
                                <span className="p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
                                  <AlertTriangle size={18} />
                                </span>
                              ) : (
                                <span className="p-2 rounded-lg bg-brand-50 text-brand-600 border border-brand-200">
                                  <FileText size={18} />
                                </span>
                              )}
                              <div className="truncate">
                                <h5 className="font-bold text-ink-900 text-sm truncate group-hover:text-brand-700 transition" title={s.name}>
                                  {s.name}
                                </h5>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-ink-500 font-mono">
                                  <span>ID: {s.id || `DOC-${sIdx + 1}`}</span>
                                  <span>•</span>
                                  <span className="text-brand-700 font-semibold uppercase">
                                    {isNotice ? 'Official Notice' : isFlag ? 'Statutory Flag' : 'Repository Record'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <span className="shrink-0 text-[11px] font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full">
                              {s.count} {s.count === 1 ? 'hit' : 'hits'}
                            </span>
                          </div>

                          {s.snippet ? (
                            <div className="p-3 rounded-lg bg-surface-canvas border border-border text-xs text-ink-700 leading-relaxed font-sans">
                              <span className="text-ink-400 select-none">“</span>
                              {renderHighlightedSnippet(s.snippet, activeWord?.text)}
                              <span className="text-ink-400 select-none">”</span>
                            </div>
                          ) : (
                            <div className="p-2.5 rounded bg-surface-sunken text-[11px] text-ink-500 italic">
                              Term identified across production ledgers, compliance notices, and geological records.
                            </div>
                          )}
                        </div>

                        {/* Interactive Clickable Redirect Footer */}
                        <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                          <span className="text-ink-500 text-[11px]">
                            {isNotice
                              ? 'Directs to Notice Board'
                              : isFlag
                              ? 'Directs to Compliance Ledger'
                              : 'Directs to Document Studio'}
                          </span>
                          <span className="inline-flex items-center gap-1 font-bold text-brand-700 group-hover:text-brand-900 group-hover:translate-x-0.5 transition">
                            View Extracted Data <ExternalLink size={13} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-ink-500 bg-surface-canvas space-y-2">
                  <Info size={24} className="mx-auto text-ink-400" />
                  <p className="text-sm font-medium">
                    Select any keyword from the Word Cloud or Ranking Matrix to display document evidence.
                  </p>
                  <p className="text-xs text-ink-400">
                    Each keyword is mapped to real CIL records, borehole drilling logs, and parliamentary briefs.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Semantic Topic Identification Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div>
            <h3 className="text-lg font-bold text-ink-900 flex items-center gap-2">
              <Layers size={20} className="text-brand-600" /> Automated Topic Clusters
            </h3>
            <p className="text-xs text-ink-500">
              Cohesive themes discovered across cross-subsidiary operational returns, borehole logs, and parliamentary queries
            </p>
          </div>
          <span className="text-xs font-semibold text-brand-800 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
            {topics.length} Thematic Clusters
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topics.map((t) => (
            <Card key={t.id} className="p-5 hover:shadow-md transition flex flex-col justify-between bg-white border border-border">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded border border-brand-200">
                    {t.category}
                  </span>
                  <span className="text-xs text-status-success font-semibold flex items-center gap-1">
                    <TrendingUp size={13} /> {t.trend}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-ink-900 mt-2.5 leading-snug">
                  {t.topicName}
                </h4>

                <div className="mt-3.5">
                  <p className="text-[10px] font-bold text-ink-500 uppercase tracking-wider mb-2">
                    Core Keywords (Click to Filter & View Evidence)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {t.keyTerms.map((kw, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setSearchQuery(kw);
                          const matchedWord = wordCloud.find(
                            (w) => w.text.toLowerCase() === kw.toLowerCase()
                          );
                          if (matchedWord) handleSelectWord(matchedWord, true);
                          else if (evidenceRef.current) evidenceRef.current.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="text-xs bg-surface-canvas hover:bg-brand-100 hover:text-brand-900 text-ink-700 px-2.5 py-1 rounded-md border border-border transition cursor-pointer"
                        title={`Filter and inspect citations for "${kw}"`}
                      >
                        {kw}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-ink-500">
                <span className="font-medium">{t.documentCount} Linked Documents</span>
                <span className="font-bold text-brand-700">
                  Relevance: {(t.relevanceScore * 100).toFixed(0)}%
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
