import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapPin, Flag, ShieldCheck, ClipboardCheck, Wrench, Gauge, Activity as ActivityIcon, Users, FileText } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/common/Card.jsx';
import Tabs from '../../components/common/Tabs.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import RiskBadge from '../../components/common/RiskBadge.jsx';
import Timeline from '../../components/common/Timeline.jsx';
import { mineService } from '../../services/mineService.js';
import { flagService } from '../../services/flagService.js';
import { complianceService } from '../../services/complianceService.js';
import { inspectionService } from '../../services/inspectionService.js';
import { correctiveActionService } from '../../services/correctiveActionService.js';
import { riskService } from '../../services/riskService.js';
import { auditService } from '../../services/auditService.js';
import { formatDate, formatDateTime } from '../../utils/format.js';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'compliance', label: 'Compliance' },
  { key: 'inspections', label: 'Inspections' },
  { key: 'flags', label: 'Flags' },
  { key: 'actions', label: 'Corrective Actions' },
  { key: 'contractors', label: 'Contractors' },
  { key: 'documents', label: 'Documents' },
  { key: 'risk', label: 'Risk' },
  { key: 'activity', label: 'Activity' },
];

export default function MineDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  const load = useCallback(async () => {
    setState({ status: 'loading', data: null, error: null });
    try {
      const mine = await mineService.getMineById(id);
      if (!mine) {
        setState({ status: 'success', data: { mine: null }, error: null });
        return;
      }
      const [flags, compliance, inspections, actions, risk, allAudit] = await Promise.all([
        flagService.getFlagsForMine(id).catch(() => []),
        complianceService.getComplianceForMine(id).catch(() => []),
        inspectionService.getInspectionsForMine(id).catch(() => []),
        correctiveActionService.getCorrectiveActionsForMine(id).catch(() => []),
        riskService.getRiskForMine(id).catch(() => null),
        auditService.getAuditLogs().catch(() => []),
      ]);
      const entityIds = new Set([
        ...flags.map((f) => f.id),
        ...actions.map((a) => a.id),
        ...inspections.map((i) => i.id),
        id,
      ]);
      const activity = allAudit.filter((log) => entityIds.has(log.entity) || entityIds.has(log.entityId));
      setState({ status: 'success', data: { mine, flags, compliance, inspections, actions, risk, activity }, error: null });
    } catch (err) {
      setState({ status: 'error', data: null, error: err.message || 'Unable to load this mine.' });
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === 'loading') {
    return (
      <>
        <PageHeader title={id} breadcrumbs={[{ label: 'Mines', path: '/mines' }, { label: id }]} />
        <LoadingState label="Loading mine…" />
      </>
    );
  }

  if (state.status === 'error') {
    return (
      <>
        <PageHeader title={id} breadcrumbs={[{ label: 'Mines', path: '/mines' }, { label: id }]} />
        <ErrorState message={state.error} onRetry={load} />
      </>
    );
  }

  const { mine } = state.data;

  if (!mine) {
    return (
      <>
        <PageHeader title="Mine not found" breadcrumbs={[{ label: 'Mines', path: '/mines' }]} />
        <Card>
          <EmptyState title="This mine doesn't exist" description={`No mine found with ID ${id}.`} />
        </Card>
      </>
    );
  }

  const { flags, compliance, inspections, actions, risk, activity } = state.data;

  return (
    <>
      <PageHeader
        title={mine.name}
        description={
          <span className="flex items-center gap-1.5">
            <MapPin size={13} /> {mine.location} · {mine.status}
          </span>
        }
        breadcrumbs={[{ label: 'Mines', path: '/mines' }, { label: mine.name }]}
        actions={<RiskBadge level={mine.riskLevel} score={mine.riskScore} />}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Compliance Rate" value={`${mine.complianceRate}%`} icon={ShieldCheck} />
        <StatCard label="Open Flags" value={mine.openFlags} icon={Flag} />
        <StatCard label="Open Corrective Actions" value={mine.openCorrectiveActions} icon={Wrench} />
        <StatCard label="Risk Score" value={`${mine.riskScore}/100`} icon={Gauge} tone={mine.riskLevel === 'HIGH' ? 'danger' : 'neutral'} />
      </div>

      <Card padded={false}>
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        <div className="p-5">
          {tab === 'overview' && (
            <div className="space-y-3 text-sm text-ink-700">
              <p>
                <span className="font-medium text-ink-900">{mine.name}</span> is currently{' '}
                <span className="font-medium">{mine.status.toLowerCase()}</span>, with a compliance rate of{' '}
                {mine.complianceRate}% and a risk score of {mine.riskScore}/100 ({mine.riskLevel}).
              </p>
              <p>
                {mine.openFlags} open flag(s) and {mine.openCorrectiveActions} open corrective action(s) are
                currently tracked against this site. Use the tabs above to drill into each governance area.
              </p>
            </div>
          )}

          {tab === 'compliance' && (
            <div>
              {compliance.length === 0 ? (
                <EmptyState title="No compliance requirements tracked for this mine yet." />
              ) : (
                <ul className="divide-y divide-border">
                  {compliance.map((c) => (
                    <li key={c.id}>
                      <Link to={`/compliance/${c.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-surface-sunken">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink-900">{c.requirement}</p>
                          <p className="text-xs text-ink-500">
                            {c.category} · Due {formatDate(c.dueDate)}
                          </p>
                        </div>
                        <StatusBadge status={c.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === 'inspections' && (
            <div>
              {inspections.length === 0 ? (
                <EmptyState title="No inspections recorded for this mine yet." />
              ) : (
                <ul className="divide-y divide-border">
                  {inspections.map((insp) => (
                    <li key={insp.id}>
                      <Link to={`/inspections/${insp.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-surface-sunken">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 truncate text-sm font-medium text-ink-900">
                            <span className="font-mono text-xs text-ink-500">{insp.id}</span>
                            {insp.inspectionType}
                          </p>
                          <p className="text-xs text-ink-500">
                            {insp.inspector} · {formatDate(insp.date)}
                          </p>
                        </div>
                        <StatusBadge status={insp.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === 'flags' && (
            <div>
              {flags.length === 0 ? (
                <EmptyState title="No flags reported for this mine yet." />
              ) : (
                <ul className="divide-y divide-border">
                  {flags.map((f) => (
                    <li key={f.id}>
                      <Link to={`/flags/${f.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-surface-sunken">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 truncate text-sm font-medium text-ink-900">
                            <span className="font-mono text-xs text-ink-500">{f.id}</span>
                            {f.category} · {f.location}
                          </p>
                          <p className="truncate text-xs text-ink-500">{f.description}</p>
                        </div>
                        <StatusBadge status={f.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === 'actions' && (
            <div>
              {actions.length === 0 ? (
                <EmptyState title="No corrective actions raised for this mine yet." />
              ) : (
                <ul className="divide-y divide-border">
                  {actions.map((a) => (
                    <li key={a.id}>
                      <Link to={`/corrective-actions/${a.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-surface-sunken">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 truncate text-sm font-medium text-ink-900">
                            <span className="font-mono text-xs text-ink-500">{a.id}</span>
                            {a.issue}
                          </p>
                          <p className="text-xs text-ink-500">Assigned to {a.assignedTo}</p>
                        </div>
                        <StatusBadge status={a.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === 'contractors' && (
            <EmptyState icon={Users} title="Contractor view coming in Phase 5" description="The Contractor Portal and per-mine contractor rollup are scoped for a later build phase." />
          )}

          {tab === 'documents' && (
            <EmptyState icon={FileText} title="Document Intelligence coming in Phase 6" description="OCR-processed documents for this mine will appear here." />
          )}

          {tab === 'risk' && (
            <div className="space-y-3">
              {risk ? (
                <>
                  <div className="flex items-center gap-3">
                    <RiskBadge level={risk.level} score={risk.score} />
                    <span className="text-xs text-ink-500">Previous score: {risk.previousScore}</span>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">Risk Contributors</p>
                    <ul className="space-y-1.5">
                      {risk.contributors.map((c) => (
                        <li key={c.label} className="flex items-center justify-between text-sm text-ink-700">
                          <span>{c.label}</span>
                          <span className="font-mono text-xs text-ink-500">{c.weight}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <EmptyState title="No risk score available for this mine yet." />
              )}
            </div>
          )}

          {tab === 'activity' && (
            <div>
              {activity.length === 0 ? (
                <EmptyState icon={ActivityIcon} title="No recorded activity for this mine yet." />
              ) : (
                <Timeline
                  items={activity.map((a) => ({ id: a.id, timestamp: a.timestamp, actor: a.actor, actorType: a.actorType, action: a.action.toLowerCase(), entity: a.entity }))}
                />
              )}
            </div>
          )}
        </div>
      </Card>
    </>
  );
}
