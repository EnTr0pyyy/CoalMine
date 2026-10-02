import {
  LayoutDashboard,
  Flag,
  MessageSquareReply,
  History,
  Mountain,
  Map,
  ShieldCheck,
  ClipboardCheck,
  Wrench,
  Users,
  Gauge,
  FileText,
  BarChart3,
  Bot,
  Bell,
  Settings,
  FolderKanban,
  ClipboardList,
  CalendarCheck,
  HardHat,
  AlertTriangle,
  TrendingUp,
  Radio,
  Megaphone,
  FileBarChart,
  Cloud,
  MessageSquare
} from 'lucide-react';
import { ROLES } from './roles.js';

// `roles: null` means "visible to every authenticated role".
export const NAV_SECTIONS = [
  {
    title: 'Statutory Core & Gazette',
    items: [
      { label: 'Executive Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: null },
      { label: 'Official Gazette & Notices', path: '/notices', icon: Megaphone, roles: null },
      { label: 'Automated Reports', path: '/reports', icon: FileBarChart, roles: null },
      { label: 'Word Cloud & Topics', path: '/topics', icon: Cloud, roles: null },
      { label: 'Parliamentary Q&A', path: '/parliamentary', icon: MessageSquare, roles: null },
      { label: 'AI Mining Copilot', path: '/copilot', icon: Bot, roles: null },
    ],
  },
  {
    title: 'Geological & CIL Subsidiaries',
    items: [
      {
        label: 'CIL Subsidiaries & Mines',
        path: '/mines',
        icon: Mountain,
        roles: null,
      },
      {
        label: 'Geological Risk Map',
        path: '/risk/map',
        icon: Map,
        roles: null,
      },
      { label: 'Document Repository', path: '/documents', icon: FileText, roles: null },
    ],
  },
  {
    title: 'Statutory Compliance & DGMS',
    items: [
      { label: 'Statutory Compliance', path: '/compliance', icon: ShieldCheck, roles: null },
      {
        label: 'DGMS Inspections',
        path: '/inspections',
        icon: ClipboardCheck,
        roles: null,
      },
      { label: 'Flags & Violations', path: '/flags', icon: Flag, roles: null },
      { label: 'Corrective Actions', path: '/corrective-actions', icon: Wrench, roles: null },
      {
        label: 'Audit Trail & Provenance',
        path: '/audit-logs',
        icon: History,
        roles: null,
      },
    ],
  },
  {
    title: 'System & Preferences',
    items: [
      { label: 'Notifications', path: '/notifications', icon: Bell, roles: null },
      { label: 'Platform Capabilities', path: '/platform', icon: Gauge, roles: null },
      { label: 'Settings', path: '/settings', icon: Settings, roles: null },
    ],
  },
];

export const CONTRACTOR_NAV_SECTIONS = [
  {
    items: [
      { label: 'My Dashboard', path: '/contractor/dashboard', icon: LayoutDashboard },
      { label: 'Official Notices', path: '/notices', icon: Megaphone },
      { label: 'My Projects', path: '/contractor/projects', icon: FolderKanban },
      { label: 'My Reports', path: '/contractor/reports', icon: ClipboardList },
      { label: 'Attendance', path: '/contractor/attendance', icon: CalendarCheck },
      { label: 'Safety Requirements', path: '/contractor/safety', icon: HardHat },
      { label: 'Assigned Corrective Actions', path: '/contractor/actions', icon: Wrench },
      { label: 'Documents', path: '/contractor/documents', icon: FileText },
      { label: 'Risk Notifications', path: '/contractor/risk', icon: AlertTriangle },
      { label: 'Performance', path: '/contractor/performance', icon: TrendingUp },
    ],
  },
  {
    items: [
      { label: 'AI Copilot', path: '/copilot', icon: Bot },
      { label: 'Notifications', path: '/notifications', icon: Bell },
      { label: 'Settings', path: '/settings', icon: Settings },
    ],
  },
];

export function navForRole(role) {
  if (role === ROLES.CONTRACTOR) return CONTRACTOR_NAV_SECTIONS;

  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.roles || item.roles.includes(role)),
  })).filter((section) => section.items.length > 0);
}
