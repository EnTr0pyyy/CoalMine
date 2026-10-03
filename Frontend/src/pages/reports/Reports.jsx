import { useEffect, useState, useRef } from 'react';
import {
  FileBarChart,
  Loader2,
  CheckCircle2,
  Layers,
  Printer,
  UploadCloud,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  Check,
  AlertCircle,
  Download,
  FileDown,
  Database,
  Save,
  Trash2,
  Table as TableIcon,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/common/Card.jsx';
import Button from '../../components/common/Button.jsx';
import { reportsService } from '../../services/reportsService.js';
import { subsidiaryService } from '../../services/subsidiaryService.js';
import { documentService } from '../../services/documentService.js';

const inputClass =
  'w-full rounded border border-border-strong bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-600 focus:ring-1 focus:ring-brand-600';

export default function Reports() {
  const [templates, setTemplates] = useState([]);
  const [subsidiaries, setSubsidiaries] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('MONTHLY_PRODUCTION_OFFTAKE');
  const [selectedSubsidiary, setSelectedSubsidiary] = useState('SECL');
  const [selectedPeriod, setSelectedPeriod] = useState('FY 2023-24 (Q4)');
  const [generationMode, setGenerationMode] = useState('UPLOAD'); // 'UPLOAD' | 'DATABASE'
  const [uploadedFile, setUploadedFile] = useState(null);
  const [saveToDatabase, setSaveToDatabase] = useState(true);
  const [dbDocuments, setDbDocuments] = useState([]);
  const [selectedDbDocIds, setSelectedDbDocIds] = useState([]);
  const [showDbDocSelector, setShowDbDocSelector] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    reportsService.getTemplates().then((tpls) => {
      setTemplates(tpls);
      if (tpls.length > 0) setSelectedTemplate(tpls[0].id);
    });
    subsidiaryService.getSubsidiaries().then((subs) => {
      setSubsidiaries(subs);
    });
    documentService.getDocuments().then((docs) => {
      if (Array.isArray(docs)) setDbDocuments(docs);
    }).catch((err) => console.warn('Notice loading DB documents:', err));
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setReport(null);
    setUploadError(null);
    try {
      let result;
      if (generationMode === 'UPLOAD') {
        if (!uploadedFile) {
          setUploadError('Please select a document or spreadsheet to analyze.');
          setGenerating(false);
          return;
        }
        result = await reportsService.analyzeAndGenerateFromUpload(uploadedFile, {
          templateType: selectedTemplate,
          subsidiary: selectedSubsidiary,
          period: selectedPeriod,
          saveToDatabase,
          selectedDocumentIds: selectedDbDocIds,
        });
      } else {
        result = await reportsService.generateAutomatedReport({
          templateType: selectedTemplate,
          subsidiary: selectedSubsidiary,
          period: selectedPeriod,
          selectedDocumentIds: selectedDbDocIds,
        });
      }
      setReport(result);
      // Refresh documents list if a new document was saved
      if (saveToDatabase && generationMode === 'UPLOAD') {
        documentService.getDocuments().then((docs) => {
          if (Array.isArray(docs)) setDbDocuments(docs);
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
      setUploadError(err.message || 'Report generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  function handleFileDrop(e) {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadedFile(e.dataTransfer.files[0]);
      setUploadError(null);
    }
  }

  function handleFileSelect(e) {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
      setUploadError(null);
    }
  }

  function handlePrint() {
    window.print();
  }

  async function handleDownloadPdf() {
    if (!report) return;
    setExportingPdf(true);
    try {
      await reportsService.exportReportPdf(report);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('PDF export failed. Please ensure the ML service is running.');
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleDownloadDocx() {
    if (!report) return;
    setExportingDocx(true);
    try {
      await reportsService.exportReportDocx(report);
    } catch (err) {
      console.error('DOCX export failed:', err);
      alert('DOCX export failed. Please ensure the ML service is running.');
    } finally {
      setExportingDocx(false);
    }
  }

  async function handleDownloadXlsx() {
    if (!report) return;
    setExportingXlsx(true);
    try {
      await reportsService.exportReportXlsx(report);
    } catch (err) {
      console.error('Excel export failed:', err);
      alert('Excel export failed. Please ensure the ML service is running.');
    } finally {
      setExportingXlsx(false);
    }
  }

  function toggleDbDocSelection(docId) {
    setSelectedDbDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  }

  const currentTemplateObj = templates.find((t) => t.id === selectedTemplate);

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #report-print-area, #report-print-area * { visibility: visible; }
          #report-print-area { position: absolute; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      {/* Top Banner & Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <PageHeader
          title="Automated Statutory Report Generation Studio"
          description="Official AI synthesis platform for CMPDI exploration dossiers, production ledgers, and parliamentary reviews across Coal India Limited (CIL) subsidiaries."
        />
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 border border-brand-200">
            <Database size={13} /> {dbDocuments.length} Verified Database Documents
          </span>
        </div>
      </div>

      {/* Configuration & Parameters Card */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-border">
          <h3 className="text-base font-semibold text-ink-900 flex items-center gap-2">
            <Layers size={18} className="text-brand-600" /> Report Specification & Source Selection
          </h3>

          {/* Source Mode Tabs */}
          <div className="flex items-center rounded-lg border border-border p-1 bg-surface-sunken">
            <button
              onClick={() => { setGenerationMode('UPLOAD'); setUploadError(null); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
                generationMode === 'UPLOAD'
                  ? 'bg-white text-brand-900 shadow-xs font-semibold'
                  : 'text-ink-600 hover:text-ink-900'
              }`}
            >
              <UploadCloud size={14} className="text-brand-600" />
              Upload & Analyze Source File
            </button>
            <button
              onClick={() => { setGenerationMode('DATABASE'); setUploadError(null); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
                generationMode === 'DATABASE'
                  ? 'bg-white text-ink-900 shadow-xs font-semibold'
                  : 'text-ink-600 hover:text-ink-900'
              }`}
            >
              <Database size={14} className="text-ink-600" />
              Synthesize from Database
            </button>
          </div>
        </div>

        {/* Upload Dropzone if in UPLOAD mode */}
        {generationMode === 'UPLOAD' && (
          <div className="mb-6 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50/40 p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.csv,.xlsx,.xls,.txt"
              className="hidden"
              onChange={handleFileSelect}
            />

            {!uploadedFile ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className="flex flex-col items-center justify-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700 mb-3">
                  <UploadCloud size={24} />
                </div>
                <h4 className="text-sm font-semibold text-ink-900 mb-1">
                  Click or drag source document / ledger here to analyze
                </h4>
                <p className="text-xs text-ink-500 mb-3">
                  Supports scanned PDFs, borehole logs, monthly production Excel (.xlsx), and CSV files up to 25 MB
                </p>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white border border-border text-xs font-medium text-ink-700 shadow-2xs">
                  Browse Files
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-brand-200 text-left">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                      {uploadedFile.name.endsWith('.csv') || uploadedFile.name.endsWith('.xlsx') ? (
                        <FileSpreadsheet size={22} />
                      ) : (
                        <FileText size={22} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink-900">{uploadedFile.name}</p>
                      <p className="text-xs text-ink-500">
                        {(uploadedFile.size / 1024).toFixed(1)} KB · Ready for Multimodal Extraction
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setUploadedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="text-xs font-semibold text-status-critical hover:underline"
                  >
                    Change File
                  </button>
                </div>

                {/* Save to Database Toggle */}
                <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-brand-200 text-left">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="saveToDbToggle"
                      checked={saveToDatabase}
                      onChange={(e) => setSaveToDatabase(e.target.checked)}
                      className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500 cursor-pointer"
                    />
                    <label htmlFor="saveToDbToggle" className="text-xs font-semibold text-ink-900 cursor-pointer flex items-center gap-1.5">
                      <Save size={14} className="text-emerald-600" />
                      Save this document to Knowledge Base & Database Repository
                    </label>
                  </div>
                  <span className="text-[11px] text-ink-500">
                    {saveToDatabase
                      ? 'Permanently stored until manually deleted'
                      : 'Temporary single-use analysis'}
                  </span>
                </div>
              </div>
            )}

            {uploadError && (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-status-critical font-medium">
                <AlertCircle size={14} /> {uploadError}
              </div>
            )}
          </div>
        )}

        {/* Existing Database Document Selector (Combine with Database) */}
        {dbDocuments.length > 0 && (
          <div className="mb-5 rounded-lg border border-border p-3.5 bg-slate-50/70">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowDbDocSelector(!showDbDocSelector)}
                className="flex items-center gap-2 text-xs font-semibold text-brand-700 hover:text-brand-800"
              >
                <Database size={15} />
                {selectedDbDocIds.length > 0
                  ? `Combining with ${selectedDbDocIds.length} Saved Database Document(s) (Click to edit)`
                  : '+ Combine with Existing Database Documents'}
              </button>
              {selectedDbDocIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedDbDocIds([])}
                  className="text-[11px] text-status-critical hover:underline"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {showDbDocSelector && (
              <div className="mt-3 space-y-1.5 max-h-44 overflow-y-auto border border-border rounded bg-white p-2">
                <p className="text-[11px] text-ink-500 mb-2 font-medium">
                  Select existing repository files to synthesize alongside this report:
                </p>
                {dbDocuments.map((doc) => (
                  <label
                    key={doc.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-slate-50 text-xs cursor-pointer border-b border-border/50 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedDbDocIds.includes(doc.id)}
                        onChange={() => toggleDbDocSelection(doc.id)}
                        className="h-3.5 w-3.5 rounded border-border text-brand-600 focus:ring-brand-500"
                      />
                      <span className="font-medium text-ink-800">{doc.name}</span>
                      <span className="text-[10px] text-ink-500">({doc.mineName || 'CIL'})</span>
                    </div>
                    <span className="text-[10px] bg-slate-100 text-ink-600 px-1.5 py-0.5 rounded">
                      {doc.fileType}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-700">Report Template</label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className={inputClass}
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.title}
                </option>
              ))}
            </select>
            {currentTemplateObj && (
              <p className="mt-1.5 text-xs text-ink-500 italic">
                {currentTemplateObj.description}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-700">CIL Subsidiary / Entity</label>
            <select
              value={selectedSubsidiary}
              onChange={(e) => setSelectedSubsidiary(e.target.value)}
              className={inputClass}
            >
              <option value="ALL_CIL">All Coal India Limited (Consolidated)</option>
              {subsidiaries.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-ink-500">
              Includes pithead dispatches, OBR & FMC telemetry
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-700">Reporting Time Horizon</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className={inputClass}
            >
              <option value="FY 2023-24 (Annual)">FY 2023-24 (Annual Review)</option>
              <option value="FY 2023-24 (Q4)">FY 2023-24 (Q4 - Jan to Mar)</option>
              <option value="FY 2023-24 (Q3)">FY 2023-24 (Q3 - Oct to Dec)</option>
              <option value="FY 2024-25 (Current H1)">FY 2024-25 (H1 Cumulative)</option>
            </select>
            <p className="mt-1.5 text-xs text-ink-500">
              Multi-source aggregation with historical baseline
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between border-t border-border pt-4">
          <div className="flex items-center gap-2 text-xs text-ink-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            {generationMode === 'UPLOAD'
              ? 'Multimodal Document Vision & PyMuPDF Extraction Engine Active'
              : 'Connected to local Gemma AI and CMPDI Borehole Database'}
          </div>
          <Button
            icon={generating ? Loader2 : FileBarChart}
            onClick={handleGenerate}
            disabled={generating}
            className="px-6"
          >
            {generating
              ? 'Analyzing & Compiling…'
              : generationMode === 'UPLOAD'
              ? 'Analyze & Generate Report'
              : 'Generate Automated Report'}
          </Button>
        </div>
      </Card>

      {/* Generating State */}
      {generating && (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 size={36} className="animate-spin text-brand-600" />
            <h4 className="text-base font-semibold text-ink-900">
              {generationMode === 'UPLOAD' ? 'Extracting Figures & Parsing Ingested Documents' : 'Synthesizing Geological & Mining Figures'}
            </h4>
            <p className="text-xs text-ink-500 max-w-md">
              Extracting tables from scanned PDFs, reconciling subsidiary spreadsheets, and generating in-depth technical dossier…
            </p>
          </div>
        </Card>
      )}

      {/* Generated Report Output View */}
      {report && (
        <div id="report-print-area" className="space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-5 rounded-lg border border-border shadow-sm gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                  Official Ministry Document
                </span>
                {report.uploadedSource?.savedToDatabase && (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    <Check size={10} /> Saved to Database ({report.uploadedSource.databaseDocId || 'Permanent'})
                  </span>
                )}
                {report.uploadedSource?.combinedDbDocs?.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                    <Database size={10} /> Combined with {report.uploadedSource.combinedDbDocs.length} DB records
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-ink-900 mt-1">{report.reportTitle}</h2>
              <p className="text-xs text-ink-500 mt-0.5">
                Compiled at {report.generatedAt} · Target: {report.subsidiary} ({report.period})
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Download PDF */}
              <button
                onClick={handleDownloadPdf}
                disabled={exportingPdf}
                className="flex items-center gap-1.5 rounded border border-brand-600 bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition disabled:opacity-60 shadow-xs"
              >
                {exportingPdf ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                {exportingPdf ? 'Generating PDF…' : 'Download PDF'}
              </button>

              {/* Download DOCX */}
              <button
                onClick={handleDownloadDocx}
                disabled={exportingDocx}
                className="flex items-center gap-1.5 rounded border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-60 shadow-xs"
              >
                {exportingDocx ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
                {exportingDocx ? 'Generating Word…' : 'Download Word'}
              </button>

              {/* Download Excel (.xlsx) */}
              {report.tabularBreakdown && report.tabularBreakdown.length > 0 && (
                <button
                  onClick={handleDownloadXlsx}
                  disabled={exportingXlsx}
                  className="flex items-center gap-1.5 rounded border border-teal-600 bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 transition disabled:opacity-60 shadow-xs"
                >
                  {exportingXlsx ? <Loader2 size={13} className="animate-spin" /> : <TableIcon size={13} />}
                  {exportingXlsx ? 'Generating Excel…' : 'Download Excel'}
                </button>
              )}

              {/* Browser Print */}
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-slate-50 transition"
              >
                <Printer size={13} /> Print
              </button>
            </div>
          </div>

          {/* Official Document Specification & Verification Strip (Replaced Gimmicky Scorecard) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 bg-slate-50 border border-border p-4 rounded-lg text-xs">
            <div>
              <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wider block">Target Entity</span>
              <p className="font-bold text-ink-900 mt-0.5">{report.subsidiary}</p>
              <p className="text-[10px] text-ink-500">{report.period}</p>
            </div>
            <div>
              <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wider block">Source Material</span>
              <p className="font-bold text-ink-900 mt-0.5 truncate" title={report.uploadedSource?.filename || 'Database Ingestion'}>
                {report.uploadedSource?.filename || 'Database Repositories'}
              </p>
              <p className="text-[10px] text-ink-500">
                {report.uploadedSource?.wordCount ? `${report.uploadedSource.wordCount} words extracted` : 'Verified database telemetry'}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wider block">Database Status</span>
              <p className="font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                <CheckCircle2 size={12} />
                {report.uploadedSource?.savedToDatabase ? 'Saved to DB (Permanent)' : 'Operational Session'}
              </p>
              <p className="text-[10px] text-ink-500">Accessible for AI Copilot RAG</p>
            </div>
            <div>
              <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wider block">Traceability Reference</span>
              <p className="font-mono text-[11px] text-ink-700 mt-0.5 font-semibold">
                {report.uploadedSource?.checksum ? `${report.uploadedSource.checksum.slice(0, 14)}…` : `REG-${Date.now().toString().slice(-6)}`}
              </p>
              <p className="text-[10px] text-ink-500">Digital verification stamp</p>
            </div>
          </div>

          {/* 1. Executive Summary */}
          <Card className="p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-700 mb-2">
              1. Executive Summary
            </h3>
            <p className="text-sm leading-relaxed text-ink-900 bg-white p-4 rounded border border-border">
              {report.executiveSummary}
            </p>
          </Card>

          {/* 2. Detailed Technical & Operational Findings */}
          {report.detailedAnalysis && (
            <Card className="p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-700 mb-2">
                2. Technical & Operational Findings
              </h3>
              <div className="text-sm leading-relaxed text-ink-800 bg-white p-4 rounded border border-border whitespace-pre-line">
                {report.detailedAnalysis}
              </div>
            </Card>
          )}

          {/* 3. Key Analytical Highlights */}
          <Card className="p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-700 mb-3">
              3. Key Operational Highlights
            </h3>
            <ul className="space-y-2.5">
              {report.keyHighlights?.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm text-ink-800">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* 4. Statutory, Safety & Environmental Observations */}
          {report.complianceObservations && report.complianceObservations.length > 0 && (
            <Card className="p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-700 mb-3">
                4. Statutory, Safety & Environmental Observations
              </h3>
              <ul className="space-y-2">
                {report.complianceObservations.map((obs, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-ink-800">
                    <ShieldCheck size={16} className="text-brand-600 shrink-0 mt-0.5" />
                    <span>{obs}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* 5. Strategic & Actionable Recommendations */}
          <Card className="p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-700 mb-3">
              5. Strategic & Operational Recommendations
            </h3>
            <ol className="space-y-2.5">
              {report.actionableRecommendations?.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-ink-800">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                    {idx + 1}
                  </span>
                  <span>{rec}</span>
                </li>
              ))}
            </ol>
          </Card>

          {/* 6. Production & Mining Data Ledgers */}
          {report.tabularBreakdown?.map((tbl, idx) => (
            <Card key={idx} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-700 flex items-center gap-2">
                  <TableIcon size={16} /> 6.{idx + 1} {tbl.title || 'Extracted Mining Figures'}
                </h3>
              </div>
              <div className="overflow-x-auto rounded border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-brand-900 text-white uppercase text-[10px] tracking-wider">
                    <tr>
                      {tbl.columns?.map((col, cIdx) => (
                        <th key={cIdx} className="px-4 py-3 font-semibold">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white">
                    {tbl.rows?.map((row, rIdx) => (
                      <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-4 py-2.5 text-ink-800">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
