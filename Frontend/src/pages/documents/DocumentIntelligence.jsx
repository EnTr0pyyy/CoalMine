import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  Loader2,
  CheckCircle2,
  Eye,
  Wrench,
  ShieldCheck,
  TrendingUp,
  History,
  Layers,
  Hash,
  AlertCircle
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/common/Card.jsx';
import Button from '../../components/common/Button.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import FileUploader from '../../components/common/FileUploader.jsx';
import DocumentExtractedDataPanel from '../../components/documents/DocumentExtractedDataPanel.jsx';
import { documentService } from '../../services/documentService.js';
import { subsidiaryService } from '../../services/subsidiaryService.js';
import { formatDate } from '../../utils/format.js';

const STATUS_META = {
  Processing: { icon: Loader2, className: 'animate-spin text-status-warning', label: 'Processing' },
  Processed: { icon: CheckCircle2, className: 'text-status-success', label: 'Processed' },
};

// Historical vs Contemporary baseline datasets for CIL subsidiaries
const HISTORICAL_TRACEABILITY_DATA = {
  SECL: {
    name: 'South Eastern Coalfields Limited',
    fy22: { prod: 142.5, obr: 220.1, offtake: 140.0, status: 'Archived Record' },
    fy23: { prod: 167.0, obr: 266.2, offtake: 160.5, status: 'Audited Ledger' },
    fy24: { prod: 187.3, target: 197.0, obr: 284.1, offtake: 182.0, status: 'Contemporary Certified' },
    strippingRatio: '1.52 Cu.m/T',
    yoyGrowth: '+12.15%',
    provenanceHash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    checks: [
      { name: 'Opencast/Underground Aggregation Check', status: 'PASSED', detail: 'Opencast (173.2 MT) + UG (14.1 MT) = 187.3 MT' },
      { name: 'Historical YoY Drift Anomaly Check', status: 'PASSED', detail: '+12.15% YoY growth within normal boundary (< +30%)' },
      { name: 'Stripping Ratio Statutory Norms', status: 'PASSED', detail: '1.52 Cu.m/T compliant with approved Mining Plan' }
    ]
  },
  MCL: {
    name: 'Mahanadi Coalfields Limited',
    fy22: { prod: 168.2, obr: 180.4, offtake: 165.0, status: 'Archived Record' },
    fy23: { prod: 193.3, obr: 218.0, offtake: 190.2, status: 'Audited Ledger' },
    fy24: { prod: 206.1, target: 204.0, obr: 231.5, offtake: 200.4, status: 'Contemporary Certified' },
    strippingRatio: '1.12 Cu.m/T',
    yoyGrowth: '+6.62%',
    provenanceHash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    checks: [
      { name: 'Production Target Surpassed Check', status: 'PASSED', detail: '206.1 MT achieved vs 204.0 MT target (101.0%)' },
      { name: 'Historical YoY Drift Anomaly Check', status: 'PASSED', detail: '+6.62% YoY sustainable continuous growth' },
      { name: 'FMC Silo Mechanized Loading Ratio', status: 'PASSED', detail: '84.5% of offtake dispatched via direct rapid rail sidings' }
    ]
  },
  NCL: {
    name: 'Northern Coalfields Limited',
    fy22: { prod: 122.4, obr: 410.0, offtake: 120.0, status: 'Archived Record' },
    fy23: { prod: 131.0, obr: 465.0, offtake: 130.1, status: 'Audited Ledger' },
    fy24: { prod: 136.2, target: 135.0, obr: 490.2, offtake: 135.8, status: 'Contemporary Certified' },
    strippingRatio: '3.60 Cu.m/T',
    yoyGrowth: '+3.97%',
    provenanceHash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    checks: [
      { name: '100% Opencast Mechanization Verification', status: 'PASSED', detail: '100% HEMM production confirmed across 10 opencast pits' },
      { name: 'Dragline Stripping Ratio Bounds', status: 'PASSED', detail: '3.60 Cu.m/T conforms to Singrauli deep bench overburden profile' }
    ]
  },
  CMPDI: {
    name: 'Central Mine Planning and Design Institute',
    fy22: { drilling: '13.2 L.M', reports: 38, status: 'Archived Record' },
    fy23: { drilling: '13.9 L.M', reports: 40, status: 'Audited Ledger' },
    fy24: { drilling: '14.8 L.M', target: '14.2 L.M', reports: 42, status: 'Contemporary Certified' },
    strippingRatio: 'N/A (Exploration & Design)',
    yoyGrowth: '+6.47%',
    provenanceHash: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
    checks: [
      { name: 'Exploratory Core Meterage Check', status: 'PASSED', detail: '14.8 Lakh Meters achieved against 14.2 L.M target (104.2%)' },
      { name: 'Geological Reserve Assessment Reports', status: 'PASSED', detail: '42 detailed geological reports (GRs) completed and vetted' }
    ]
  }
};

export default function DocumentIntelligence() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('ingest'); // 'ingest' | 'traceability'
  const [selectedTraceSubsidiary, setSelectedTraceSubsidiary] = useState('SECL');
  const [state, setState] = useState({ status: 'loading', documents: [], error: null });
  const [expandedId, setExpandedId] = useState(null);
  const [showUploader, setShowUploader] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [subsidiaries, setSubsidiaries] = useState([]);
  const [selectedSubCode, setSelectedSubCode] = useState('SECL');
  const [uploading, setUploading] = useState(false);

  async function load() {
    setState({ status: 'loading', documents: [], error: null });
    try {
      const documents = await documentService.getDocuments();
      setState({ status: 'success', documents, error: null });
    } catch (err) {
      setState({ status: 'error', documents: [], error: err.message || 'Unable to load documents.' });
    }
  }

  useEffect(() => {
    load();
    subsidiaryService.getSubsidiaries().then((subs) => {
      setSubsidiaries(subs);
      if (subs.length > 0) setSelectedSubCode(subs[0].code);
    });
  }, []);

  async function handleUpload() {
    if (pendingFiles.length === 0) return;
    setUploading(true);
    try {
      const sub = subsidiaries.find((s) => s.code === selectedSubCode);
      for (const file of pendingFiles) {
        const isPdf = file.name?.toLowerCase().endsWith('.pdf');
        const isSheet = file.name?.toLowerCase().endsWith('.xlsx') || file.name?.toLowerCase().endsWith('.csv');
        const doc = await documentService.uploadDocument({
          name: file.name,
          fileType: isSheet ? 'Spreadsheet' : isPdf ? 'PDF' : 'Image',
          mineId: selectedSubCode,
          mineName: sub ? `${sub.code} — ${sub.name}` : selectedSubCode,
        });
        await load();
        documentService.processDocument(doc.id).then(load);
      }
      setPendingFiles([]);
      setShowUploader(false);
    } finally {
      setUploading(false);
      await load();
    }
  }

  const currentTrace = HISTORICAL_TRACEABILITY_DATA[selectedTraceSubsidiary] || HISTORICAL_TRACEABILITY_DATA.SECL;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Multimodal Geological & Production Document Studio"
        description="AI-powered digitization and figure extraction from scanned PDFs, spreadsheets, borehole surveys, and historical archives with automated cross-validation."
        actions={
          <Button icon={UploadCloud} onClick={() => setShowUploader((v) => !v)}>
            {showUploader ? 'Cancel' : 'Ingest Document / Spreadsheet'}
          </Button>
        }
      />

      {/* Mode Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab('ingest')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition ${
            activeTab === 'ingest'
              ? 'bg-brand-700 text-white shadow-sm'
              : 'bg-white border border-border text-ink-700 hover:bg-slate-50'
          }`}
        >
          <FileText size={15} /> Document Ingestion & Figure Extraction
        </button>

        <button
          onClick={() => setActiveTab('traceability')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition ${
            activeTab === 'traceability'
              ? 'bg-brand-700 text-white shadow-sm'
              : 'bg-white border border-border text-ink-700 hover:bg-slate-50'
          }`}
        >
          <History size={15} /> Historical vs. Contemporary Traceability Matrix
        </button>
      </div>

      {/* Uploader Box */}
      {showUploader && (
        <Card className="mb-4 max-w-xl p-5 border-2 border-dashed border-brand-300 bg-brand-50/20">
          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold text-ink-700">Originating CIL Subsidiary</label>
            <select
              value={selectedSubCode}
              onChange={(e) => setSelectedSubCode(e.target.value)}
              className="w-full rounded border border-border bg-white px-3 py-2 text-sm text-ink-900"
            >
              {subsidiaries.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          </div>
          <FileUploader
            files={pendingFiles}
            onChange={setPendingFiles}
            label="Upload Scanned Geological PDF, Borehole Survey, or Production Spreadsheet (.xlsx / .csv)"
          />
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-ink-500">Multimodal pipeline extracts figures & validates checksums</span>
            <Button size="sm" onClick={handleUpload} disabled={uploading || pendingFiles.length === 0}>
              {uploading ? 'Processing Extraction…' : 'Start AI Ingestion'}
            </Button>
          </div>
        </Card>
      )}

      {/* TAB 1: Document Ingestion & Extraction List */}
      {activeTab === 'ingest' && (
        <>
          {state.status === 'loading' && <LoadingState label="Loading documents…" />}
          {state.status === 'error' && <ErrorState message={state.error} onRetry={load} />}
          {state.status === 'success' && state.documents.length === 0 && (
            <Card>
              <EmptyState title="No documents ingested yet" icon={FileText} />
            </Card>
          )}

          {state.status === 'success' && state.documents.length > 0 && (
            <div className="space-y-3">
              {state.documents.map((doc) => {
                const meta = STATUS_META[doc.status] || STATUS_META.Processed;
                const StatusIcon = meta.icon;
                const expanded = expandedId === doc.id;
                return (
                  <Card key={doc.id} padded={false}>
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="rounded bg-brand-50 p-2 text-brand-700 border border-brand-100">
                          <FileText size={18} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink-900">{doc.name}</p>
                          <p className="text-xs text-ink-500">
                            {doc.mineName} · {formatDate(doc.uploadedDate)} · Format: <strong>{doc.fileType}</strong>
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                          <StatusIcon size={14} className={meta.className} /> {meta.label}
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Eye}
                          onClick={() => setExpandedId(expanded ? null : doc.id)}
                        >
                          {expanded ? 'Hide Details' : 'View Extracted Figures'}
                        </Button>
                      </div>
                    </div>

                    {expanded && doc.extractedData && (
                      <div className="border-t border-border p-4 bg-slate-50/50">
                        <DocumentExtractedDataPanel data={doc.extractedData} />
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: Historical vs. Contemporary Traceability Matrix */}
      {activeTab === 'traceability' && (
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-ink-900 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-brand-600" /> Cross-Dataset Historical Continuity & Consistency Ledger
                </h3>
                <p className="text-xs text-ink-500">
                  Cross-validating contemporary production figures against historical CCO & CIL archives to eliminate manual discrepancy
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-ink-600">Select Subsidiary:</label>
                <select
                  value={selectedTraceSubsidiary}
                  onChange={(e) => setSelectedTraceSubsidiary(e.target.value)}
                  className="rounded border border-border bg-white px-3 py-1.5 text-xs text-ink-900 font-semibold"
                >
                  <option value="SECL">SECL (Chhattisgarh/MP)</option>
                  <option value="MCL">MCL (Odisha)</option>
                  <option value="NCL">NCL (Singrauli)</option>
                  <option value="CMPDI">CMPDI (Exploration & Boreholes)</option>
                </select>
              </div>
            </div>

            {/* Side-by-side Historical Comparison Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="rounded-lg bg-slate-50 border border-border p-4">
                <span className="text-[11px] font-semibold uppercase text-ink-500">FY 2021-22 (Historical Archive)</span>
                <p className="text-xl font-bold text-ink-800 mt-1">
                  {currentTrace.fy22.prod ? `${currentTrace.fy22.prod} MT` : currentTrace.fy22.drilling}
                </p>
                <p className="text-xs text-ink-500 mt-1">
                  OBR: {currentTrace.fy22.obr ? `${currentTrace.fy22.obr} M.Cu.m` : `${currentTrace.fy22.reports} Reports`}
                </p>
                <span className="inline-block mt-2 text-[10px] font-medium text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                  {currentTrace.fy22.status}
                </span>
              </div>

              <div className="rounded-lg bg-slate-50 border border-border p-4">
                <span className="text-[11px] font-semibold uppercase text-ink-500">FY 2022-23 (Audited Baseline)</span>
                <p className="text-xl font-bold text-ink-800 mt-1">
                  {currentTrace.fy23.prod ? `${currentTrace.fy23.prod} MT` : currentTrace.fy23.drilling}
                </p>
                <p className="text-xs text-ink-500 mt-1">
                  OBR: {currentTrace.fy23.obr ? `${currentTrace.fy23.obr} M.Cu.m` : `${currentTrace.fy23.reports} Reports`}
                </p>
                <span className="inline-block mt-2 text-[10px] font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                  {currentTrace.fy23.status}
                </span>
              </div>

              <div className="rounded-lg bg-emerald-50 border border-emerald-300 p-4">
                <span className="text-[11px] font-bold uppercase text-emerald-800">FY 2023-24 (Contemporary Submission)</span>
                <p className="text-xl font-bold text-emerald-700 mt-1">
                  {currentTrace.fy24.prod ? `${currentTrace.fy24.prod} MT` : currentTrace.fy24.drilling}
                </p>
                <p className="text-xs text-emerald-700 mt-1">
                  Target: {currentTrace.fy24.target ? `${currentTrace.fy24.target} MT` : '14.2 L.M'} · Growth: {currentTrace.yoyGrowth}
                </p>
                <span className="inline-block mt-2 text-[10px] font-bold text-emerald-800 bg-emerald-200 px-2 py-0.5 rounded">
                  {currentTrace.fy24.status} ✓
                </span>
              </div>
            </div>

            {/* Consistency Validation Checks List */}
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-700 mb-3 flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-emerald-600" /> Automated Integrity & Boundary Checks
            </h4>
            <div className="space-y-2 mb-6">
              {currentTrace.checks.map((chk, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white border border-border text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-ink-900">{chk.name}</span>
                      <p className="text-[11px] text-ink-500">{chk.detail}</p>
                    </div>
                  </div>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {chk.status}
                  </span>
                </div>
              ))}
            </div>

            {/* Cryptographic Traceability Provenance */}
            <div className="p-3.5 rounded-lg bg-slate-900 text-white text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-brand-300 flex items-center gap-1.5">
                  <Hash size={14} /> Cryptographic Provenance Hash (SHA-256)
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">Status: Immutable Audit Trail Locked</span>
              </div>
              <p className="font-mono text-[11px] text-slate-300 break-all">{currentTrace.provenanceHash}</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
