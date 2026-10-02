import {
  ArrowUpRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Cloud,
  Cpu,
  Database,
  FileBarChart,
  FileText,
  Gauge,
  Layers,
  Mail,
  Printer,
  Search,
  Server,
  Settings,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader.jsx';

const architecture = [
  { label: 'Experience', value: 'React + Vite', port: '5173', icon: Gauge },
  { label: 'Application API', value: 'Node.js + Express + Prisma', port: '5000', icon: Server },
  { label: 'Document AI', value: 'FastAPI + PyTorch + Donut', port: '8001', icon: Cpu },
  { label: 'Data store', value: 'PostgreSQL', port: '5432', icon: Database },
  { label: 'Local inference', value: 'Ollama · Gemma 3:1b', port: '11434', icon: Bot },
];

const capabilities = [
  {
    number: '01',
    title: 'OCR & document intelligence',
    description: 'Tesseract OCR handles page and full-document text extraction with script/language detection. Donut provides targeted visual field extraction.',
    proof: 'POST /ocr/extract · /ocr/extract-full · /ocr/hybrid · /pdf/extract-fields',
    status: 'Integrated',
    tone: 'green',
    icon: FileText,
    href: '/documents',
    linkLabel: 'Open document repository',
  },
  {
    number: '02',
    title: 'Mining report table extraction',
    description: 'Camelot lattice/stream parsing is paired with pdfplumber as a fallback for tabular PDFs.',
    proof: 'ML/tabular_processor.py · CSV, XLSX and PDF processing',
    status: 'Integrated',
    tone: 'green',
    icon: Layers,
    href: '/documents',
    linkLabel: 'Open document repository',
  },
  {
    number: '03',
    title: 'Formatted PDF reports',
    description: 'WeasyPrint renders the report template; ReportLab is available as a fallback renderer.',
    proof: 'POST /api/reports/export/pdf',
    status: 'Integrated',
    tone: 'green',
    icon: FileBarChart,
    href: '/reports',
    linkLabel: 'Open reports',
  },
  {
    number: '04',
    title: 'Editable DOCX reports',
    description: 'python-docx exports executive summaries, highlights, recommendations and tables to Word format.',
    proof: 'POST /api/reports/export/docx',
    status: 'Integrated',
    tone: 'green',
    icon: FileText,
    href: '/reports',
    linkLabel: 'Open reports',
  },
  {
    number: '05',
    title: 'Local AI runtime',
    description: 'Ollama provides local inference; Gemma 3:1b is the configured default chat model. Runtime availability depends on the host machine.',
    proof: 'Ollama :11434 · ML service :8001',
    status: 'Locally configured',
    tone: 'blue',
    icon: Bot,
    href: '/copilot',
    linkLabel: 'Open AI Copilot',
  },
  {
    number: '06',
    title: 'PostgreSQL full-text search',
    description: 'tsvector/tsquery search with GIN indexes across flags, corrective actions, inspections and notices.',
    proof: 'GET /api/search · top-bar search',
    status: 'Integrated',
    tone: 'green',
    icon: Search,
    href: '/dashboard',
    linkLabel: 'Open dashboard',
  },
  {
    number: '07',
    title: 'Email notification templates',
    description: 'Nodemailer templates cover overdue actions, critical flags, parliamentary deadlines and report delivery. SMTP and automatic triggers need deployment configuration.',
    proof: 'Backend/src/services/emailService.js',
    status: 'Configuration needed',
    tone: 'amber',
    icon: Mail,
    href: '/settings',
    linkLabel: 'Open settings',
  },
  {
    number: '08',
    title: 'Subsidiary analytics matrix',
    description: 'Apache ECharts renders production, target, offtake and OBR comparisons for seven CIL subsidiaries. Current chart values are illustrative defaults, not live database figures.',
    proof: 'Dashboard · ProductionEChart.jsx',
    status: 'Dashboard demo data',
    tone: 'amber',
    icon: BarChart3,
    href: '/dashboard',
    linkLabel: 'Open dashboard',
  },
  {
    number: '09',
    title: 'Docker & n8n workflow stack',
    description: 'Compose defines PostgreSQL, Redis, n8n, the Express API and ML service. Container deployment and scheduled n8n workflows are not verified here.',
    proof: 'docker-compose.yml · n8n :5678 · Redis :6379',
    status: 'Deployment unverified',
    tone: 'amber',
    icon: Cloud,
    href: null,
    linkLabel: null,
  },
];

const toneClasses = {
  green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  blue: 'border-sky-200 bg-sky-50 text-sky-800',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
};

export default function PlatformOverview() {
  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-10">
      <PageHeader
        title="Platform capabilities"
        description="A technical briefing of CoalSetu’s application stack, AI and document workflows, analytics, and deployment readiness."
        breadcrumbs={[{ label: 'System & Preferences', path: '/settings' }, { label: 'Platform capabilities' }]}
        actions={(
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-ink-700 hover:bg-surface-sunken"
          >
            <Printer size={15} />
            Print brief
          </button>
        )}
      />

      <section className="overflow-hidden rounded-lg border border-brand-800 bg-brand-900 text-white">
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-200">CoalSetu · Platform brief</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Mining governance, document AI and reporting</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-100/80">
              One workspace for statutory operations, multimodal document processing, local AI assistance and CIL subsidiary analytics.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-5 border-t border-brand-700 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div><p className="text-2xl font-bold">09</p><p className="mt-1 text-[11px] text-brand-100/70">capabilities</p></div>
            <div><p className="text-2xl font-bold">05</p><p className="mt-1 text-[11px] text-brand-100/70">core services</p></div>
            <div><p className="text-2xl font-bold">07</p><p className="mt-1 text-[11px] text-brand-100/70">CIL subsidiaries</p></div>
          </div>
        </div>
      </section>

      <section aria-labelledby="architecture-heading">
        <div className="mb-3 flex items-center gap-2">
          <Settings size={16} className="text-brand-700" />
          <h2 id="architecture-heading" className="text-sm font-bold text-ink-900">Platform architecture</h2>
        </div>
        <div className="grid overflow-hidden rounded-lg border border-border bg-white sm:grid-cols-2 lg:grid-cols-5">
          {architecture.map(({ label, value, port, icon: Icon }, index) => (
            <div key={label} className={`p-4 ${index > 0 ? 'border-t border-border sm:border-l lg:border-t-0' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{label}</span>
                <Icon size={15} className="text-brand-700" />
              </div>
              <p className="mt-3 text-sm font-semibold text-ink-900">{value}</p>
              <p className="mt-1 font-mono text-xs text-ink-500">:{port}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="capabilities-heading">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="capabilities-heading" className="text-sm font-bold text-ink-900">Integrated capabilities</h2>
            <p className="mt-1 text-xs text-ink-500">Implementation and operational readiness are shown separately.</p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-ink-500">
            <span className="inline-flex items-center gap-1"><CheckCircle2 size={13} className="text-emerald-700" /> Implemented</span>
            <span className="inline-flex items-center gap-1"><Settings size={13} className="text-amber-700" /> Setup / validation</span>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {capabilities.map(({ number, title, description, proof, status, tone, icon: Icon, href, linkLabel }) => (
            <article key={number} className="flex min-h-56 flex-col rounded-lg border border-border bg-white p-4 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-800">
                    <Icon size={17} />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">{number} / 09</p>
                    <h3 className="mt-0.5 text-sm font-bold text-ink-900">{title}</h3>
                  </div>
                </div>
                <span className={`shrink-0 rounded border px-2 py-1 text-[10px] font-semibold ${toneClasses[tone]}`}>
                  {status}
                </span>
              </div>
              <p className="mt-4 flex-1 text-xs leading-5 text-ink-600">{description}</p>
              <p className="mt-3 border-t border-border pt-3 font-mono text-[10px] leading-4 text-ink-500">{proof}</p>
              {href && (
                <Link to={href} className="mt-3 inline-flex w-fit items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900">
                  {linkLabel}<ArrowUpRight size={13} />
                </Link>
              )}
            </article>
          ))}
        </div>
      </section>

      <aside className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/70 p-4 text-xs leading-5 text-amber-950">
        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-amber-700" />
        <p>
          <strong>Presentation note:</strong> OCR/table-extraction accuracy percentages are not shown because a labeled benchmark result is not present in the repository. The dashboard chart currently uses illustrative values; email SMTP and n8n workflow deployment need environment-level setup.
        </p>
      </aside>
    </div>
  );
}