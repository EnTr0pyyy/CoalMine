import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Building2,
  FileBarChart,
  Cloud,
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  Compass,
  AlertCircle,
  Megaphone,
  FileText,
  Calendar,
  Landmark
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/common/Card.jsx';
import Button from '../../components/common/Button.jsx';
import { subsidiaryService } from '../../services/subsidiaryService.js';
import { parliamentaryService } from '../../services/parliamentaryService.js';
import { analyticsService } from '../../services/analyticsService.js';
import { noticeService } from '../../services/noticeService.js';
import { formatDate } from '../../utils/format.js';
import ProductionEChart from '../../components/dashboard/ProductionEChart.jsx';

export default function Dashboard() {
  const [subsidiaries, setSubsidiaries] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [wordCloud, setWordCloud] = useState([]);
  const [stats, setStats] = useState(null);
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    subsidiaryService.getSubsidiaries().then(setSubsidiaries);
    parliamentaryService.getInquiries().then(setInquiries);
    analyticsService.getWordCloud({ maxWords: 15 }).then(setWordCloud);
    noticeService.getNotices().then(setNotices);
    analyticsService.getPlatformStats().then((data) => {
      if (data) setStats(data);
    });
  }, []);

  const activeNotices = (notices || []).filter((n) => n.status === 'Active').slice(0, 3);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-8">
      {/* Sovereign Brand Hero Header */}
      <div className="rounded-2xl border border-brand-800 bg-brand-900 p-6 sm:p-8 text-white shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-status-success/20 border border-status-success/30 px-3 py-1 text-xs font-medium text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Ministry of Coal & CIL Subsidiaries
              </span>
              <span className="rounded-full bg-brand-800 border border-brand-700 px-3 py-1 text-xs font-medium text-brand-100">
                {stats?.source ? `DB: ${stats.source}` : 'Gemma 3 Sovereign AI Core'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              CoalSetu Intelligence & Reporting Platform
            </h1>
            <p className="text-sm text-brand-100/80 leading-relaxed">
              Centralized AI engine for geological exploration dossiers, raw coal production analytics, and automated parliamentary and statutory inquiry responses.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <NavLink
              to="/reports"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 transition"
            >
              <FileBarChart size={15} /> Automated Reports
            </NavLink>
            <NavLink
              to="/parliamentary"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-800 border border-brand-700 px-4 py-2.5 text-xs font-semibold text-brand-100 shadow-sm hover:bg-brand-700 hover:text-white transition"
            >
              <MessageSquare size={15} /> Parliamentary Q&A
            </NavLink>
          </div>
        </div>
      </div>

      {/* Official Notice Board (Sleek, Spacious & On Top) */}
      <div className="rounded-2xl border border-border bg-surface-card p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-border gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-800 shadow-xs">
              <Megaphone size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-ink-900 tracking-tight">
                  Official Notice Board & Circulars
                </h2>
                <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[11px] font-semibold text-brand-800">
                  Active Directives
                </span>
              </div>
              <p className="text-xs text-ink-500 mt-0.5">
                Official notifications issued by Ministry of Coal, DGMS, and CMPDI Headquarters
              </p>
            </div>
          </div>
          <NavLink
            to="/notices"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-800 transition shrink-0"
          >
            <span>View all notices ({notices.length || 6})</span>
            <ArrowRight size={13} />
          </NavLink>
        </div>

        {/* Spacious 3-column Notices */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {activeNotices.map((n) => (
            <div
              key={n.id}
              className="flex flex-col justify-between rounded-xl border border-border bg-surface-sunken/60 p-5 hover:bg-white hover:border-border-strong hover:shadow-xs transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="rounded-md bg-white border border-border px-2 py-0.5 text-[11px] font-semibold text-ink-700">
                    {n.refNo || n.id}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                      n.priority === 'HIGH'
                        ? 'bg-status-dangerBg text-status-danger border border-status-danger/20'
                        : 'bg-surface-sunken text-ink-700 border border-border'
                    }`}
                  >
                    {n.priority === 'HIGH' ? 'Critical' : n.priority}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-ink-900 leading-snug line-clamp-2">
                  {n.title}
                </h4>
                <p className="text-xs text-ink-500 mt-2 line-clamp-2 leading-relaxed">
                  {n.description}
                </p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-border flex items-center justify-between text-xs text-ink-500">
                <span className="truncate max-w-[130px] font-medium text-ink-700">{n.authority || 'Ministry of Coal'}</span>
                <span className="flex items-center gap-1 text-ink-500 font-medium">
                  <Clock size={12} className="text-ink-500" />
                  Due {formatDate(n.expiryDate)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Apache ECharts Subsidiary Matrix Widget */}
      <ProductionEChart />

      {/* Spacious 3x2 Platform Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="rounded-2xl border border-border bg-surface-card p-6 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">CIL Raw Coal Production</span>
            <span className="p-2 rounded-xl bg-surface-sunken text-ink-700">
              <Building2 size={16} />
            </span>
          </div>
          <p className="text-3xl font-bold text-ink-900 tracking-tight mt-3">
            {stats?.production?.totalMT ? `${stats.production.totalMT} MT` : '773.6 MT'}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-status-successBg px-2 py-0.5 text-xs font-medium text-status-success">
              {stats?.production?.achievementPct ? `${stats.production.achievementPct}% Achieved` : '+10.0% YoY'}
            </span>
            <span className="text-xs text-ink-500">Target Realization</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface-card p-6 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Overburden Removal (OBR)</span>
            <span className="p-2 rounded-xl bg-surface-sunken text-ink-700">
              <Layers size={16} />
            </span>
          </div>
          <p className="text-3xl font-bold text-ink-900 tracking-tight mt-3">
            {stats?.overburden?.totalMCum ? `${Number(stats.overburden.totalMCum).toLocaleString()} M.Cu.m` : '1,755 M.Cu.m'}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-status-successBg px-2 py-0.5 text-xs font-medium text-status-success">
              {stats?.overburden?.strippingBufferPct ? `+${stats.overburden.strippingBufferPct}% Buffer` : '+8.4% Buffer'}
            </span>
            <span className="text-xs text-ink-500">Stripping Ratio Maintained</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface-card p-6 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">CMPDI Core Drilling</span>
            <span className="p-2 rounded-xl bg-surface-sunken text-ink-700">
              <Compass size={16} />
            </span>
          </div>
          <p className="text-3xl font-bold text-ink-900 tracking-tight mt-3">
            {stats?.drilling?.lakhMeters ? `${stats.drilling.lakhMeters} L.Meters` : '14.8 L.Meters'}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-800">
              {stats?.drilling?.achievementPct ? `${stats.drilling.achievementPct}% Realized` : '104% Target'}
            </span>
            <span className="text-xs text-ink-500">Exploratory Boreholes</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface-card p-6 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Report Prep Latency</span>
            <span className="p-2 rounded-xl bg-status-successBg text-status-success">
              <Clock size={16} />
            </span>
          </div>
          <p className="text-3xl font-bold text-status-success tracking-tight mt-3">
            {stats?.platform?.timeSavedPct ? `-${stats.platform.timeSavedPct}%` : '-88.5%'}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-status-successBg px-2 py-0.5 text-xs font-medium text-status-success">
              {stats?.platform?.aiProcessingSeconds ? `<${stats.platform.aiProcessingSeconds}s Latency` : '<2 sec'}
            </span>
            <span className="text-xs text-ink-500">vs 6-8 hrs manual compilation</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface-card p-6 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Structured Extraction Accuracy</span>
            <span className="p-2 rounded-xl bg-brand-100 text-brand-800">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <p className="text-3xl font-bold text-brand-700 tracking-tight mt-3">
            {stats?.platform?.extractionAccuracyPct ? `${stats.platform.extractionAccuracyPct}%` : '98.8%'}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-800">
              Zero Hallucination
            </span>
            <span className="text-xs text-ink-500">Deterministic grounding</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface-card p-6 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Workflow Automation</span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Sparkles size={16} />
            </span>
          </div>
          <p className="text-3xl font-bold text-purple-700 tracking-tight mt-3">
            {stats?.platform?.workflowAutomationPct ? `${stats.platform.workflowAutomationPct}%` : '94.0%'}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
              Repetitive Reporting
            </span>
            <span className="text-xs text-ink-500">Automated ledger filings</span>
          </div>
        </div>
      </div>

      {/* 3 Core Modules Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NavLink
          to="/reports"
          className="group block rounded-2xl border border-border bg-surface-card p-7 shadow-xs hover:border-border-strong hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="rounded-xl bg-status-successBg p-3 text-status-success group-hover:scale-105 transition-transform">
                <FileBarChart size={22} />
              </span>
              <span className="text-xs font-semibold text-status-success bg-status-successBg px-2.5 py-0.5 rounded-full">
                Module 1
              </span>
            </div>
            <h3 className="text-base font-bold text-ink-900 group-hover:text-status-success transition">
              Automated Report Generation Platform
            </h3>
            <p className="text-xs text-ink-500 mt-2 leading-relaxed">
              Generate monthly production reviews, CMPDI geological reserve assessments, and inter-subsidiary matrices with PDF/Excel export.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-status-success group-hover:gap-2 transition-all">
            Launch Report Studio <ArrowRight size={14} />
          </div>
        </NavLink>

        <NavLink
          to="/topics"
          className="group block rounded-2xl border border-border bg-surface-card p-7 shadow-xs hover:border-border-strong hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="rounded-xl bg-brand-100 p-3 text-brand-800 group-hover:scale-105 transition-transform">
                <Cloud size={22} />
              </span>
              <span className="text-xs font-semibold text-brand-800 bg-brand-100 px-2.5 py-0.5 rounded-full">
                Module 2
              </span>
            </div>
            <h3 className="text-base font-bold text-ink-900 group-hover:text-brand-700 transition">
              Automated Word Cloud & Topics
            </h3>
            <p className="text-xs text-ink-500 mt-2 leading-relaxed">
              Extract high-frequency mining keywords and discover emerging topic clusters from historical archives, memos, and parliamentary records.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-brand-700 group-hover:gap-2 transition-all">
            Explore NLP Intelligence <ArrowRight size={14} />
          </div>
        </NavLink>

        <NavLink
          to="/parliamentary"
          className="group block rounded-2xl border border-border bg-surface-card p-7 shadow-xs hover:border-border-strong hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="rounded-xl bg-blue-50 p-3 text-blue-700 group-hover:scale-105 transition-transform">
                <MessageSquare size={22} />
              </span>
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
                Module 3
              </span>
            </div>
            <h3 className="text-base font-bold text-ink-900 group-hover:text-blue-700 transition">
              AI Parliamentary Q&A System
            </h3>
            <p className="text-xs text-ink-500 mt-2 leading-relaxed">
              Respond to Lok Sabha and Rajya Sabha Starred/Unstarred questions with verified tabular annexures and traceable source citations.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-blue-700 group-hover:gap-2 transition-all">
            Draft Parliamentary Reply <ArrowRight size={14} />
          </div>
        </NavLink>
      </div>

      {/* Middle Row: Active Parliamentary Inquiries & Word Cloud Teaser */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Parliamentary Questions */}
        <div className="rounded-2xl border border-border bg-surface-card p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                <MessageSquare size={16} className="text-brand-700" /> High-Priority Parliamentary Inquiries
              </h3>
              <p className="text-xs text-ink-500 mt-0.5">Current Session questions requiring Ministry draft</p>
            </div>
            <NavLink to="/parliamentary" className="text-xs font-semibold text-brand-600 hover:text-brand-800 hover:underline">
              View All ({inquiries.length})
            </NavLink>
          </div>

          <div className="space-y-3">
            {inquiries.slice(0, 3).map((q) => (
              <div key={q.id} className="p-4 rounded-xl border border-border bg-surface-sunken/60 flex items-center justify-between hover:bg-surface-sunken transition">
                <div>
                  <div className="flex items-center gap-2 text-xs mb-1">
                    <span className="font-semibold text-ink-900">{q.house}</span>
                    <span className="text-ink-500">·</span>
                    <span className="text-ink-700">{q.questionNo}</span>
                  </div>
                  <p className="text-xs font-semibold text-ink-900">{q.subject}</p>
                </div>
                <NavLink
                  to="/parliamentary"
                  className="rounded-lg bg-white border border-border px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-surface-sunken shadow-xs shrink-0 ml-4 transition"
                >
                  Draft Reply
                </NavLink>
              </div>
            ))}
          </div>
        </div>

        {/* Word Cloud Quick Snapshot */}
        <div className="rounded-2xl border border-border bg-surface-card p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                <Cloud size={16} className="text-brand-700" /> Trending Mining Keywords
              </h3>
              <p className="text-xs text-ink-500 mt-0.5">Extracted from CIL dispatches & CMPDI exploration reports</p>
            </div>
            <NavLink to="/topics" className="text-xs font-semibold text-brand-600 hover:text-brand-800 hover:underline">
              Interactive Cloud
            </NavLink>
          </div>

          <div className="flex flex-wrap gap-2 p-5 bg-surface-sunken/60 rounded-xl border border-border min-h-[160px] items-center justify-center">
            {wordCloud.slice(0, 12).map((item, idx) => (
              <span
                key={idx}
                className="inline-block px-3 py-1.5 rounded-lg bg-white border border-border text-xs font-medium text-ink-900 shadow-xs hover:border-border-strong transition"
              >
                {item.text} <strong className="text-brand-700">({item.value})</strong>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* CIL Subsidiaries & CMPDI Operational Performance Matrix */}
      <div className="rounded-2xl border border-border bg-surface-card p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-2">
          <div>
            <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
              <Building2 size={18} className="text-brand-700" /> CIL Subsidiary Operational & Geological Summary
            </h3>
            <p className="text-xs text-ink-500 mt-0.5">
              FY 2023-24 Performance breakdown across all 8 Coal India entities
            </p>
          </div>
          <span className="inline-flex self-start sm:self-auto text-xs font-semibold text-status-success bg-status-successBg px-3 py-1 rounded-full border border-status-success/20">
            All 8 Subsidiaries Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-sunken/80 font-semibold text-ink-700 uppercase tracking-wider text-[11px]">
                <th className="p-3.5">Subsidiary</th>
                <th className="p-3.5">Headquarters</th>
                <th className="p-3.5">Command Coalfields</th>
                <th className="p-3.5">Production (MT)</th>
                <th className="p-3.5">Target (MT)</th>
                <th className="p-3.5">Achievement</th>
                <th className="p-3.5">OBR / Drilling</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {subsidiaries.map((s) => (
                <tr key={s.code} className="hover:bg-surface-sunken/50 transition">
                  <td className="p-3.5 font-bold text-ink-900">
                    <span className="text-ink-900">{s.code}</span>
                    <span className="block text-[11px] font-normal text-ink-500">{s.name}</span>
                  </td>
                  <td className="p-3.5 text-ink-700">{s.headquarters}</td>
                  <td className="p-3.5 text-ink-500 max-w-xs truncate">{s.commandArea}</td>
                  <td className="p-3.5 font-bold text-ink-900">
                    {s.fy24ProductionMT ? `${s.fy24ProductionMT} MT` : 'Consultancy'}
                  </td>
                  <td className="p-3.5 text-ink-700">
                    {s.fy24TargetMT ? `${s.fy24TargetMT} MT` : '14.8 L.M'}
                  </td>
                  <td className="p-3.5 font-semibold text-status-success">
                    {s.achievementPct}%
                  </td>
                  <td className="p-3.5 text-ink-700">
                    {s.obrMCum ? `${s.obrMCum} M.Cu.m` : `${(s.fy24DrillingMeters / 100000).toFixed(1)} L.M`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
