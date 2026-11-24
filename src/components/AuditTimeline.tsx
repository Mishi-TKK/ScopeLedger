import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileSignature,
  Printer,
  Send,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { AuditEvent, AuditEventType, ChangeOrder, Project } from '../types/scope';
import {
  buildAgreementMarkdown,
  buildAuditCsv,
  formatCurrency,
  formatDateTime,
  formatSignedCurrency,
} from '../utils/format';

interface AuditTimelineProps {
  events: AuditEvent[];
  projects: Project[];
  changeOrders: ChangeOrder[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  onInspectChangeOrder: (changeOrderId: string) => void;
}

const EVENT_LABELS: Record<AuditEventType, { label: string; color: string; Icon: typeof ShieldCheck }> = {
  baseline_signed: {
    label: 'Baseline Signed',
    color: 'text-slate-900',
    Icon: FileSignature,
  },
  baseline_updated: {
    label: 'Baseline Revised',
    color: 'text-slate-700',
    Icon: ShieldCheck,
  },
  change_created: {
    label: 'Change Drafted',
    color: 'text-slate-600',
    Icon: FileSignature,
  },
  change_sent: {
    label: 'Sent to Client',
    color: 'text-amber-700',
    Icon: Send,
  },
  change_approved: {
    label: 'Client Approved',
    color: 'text-emerald-700',
    Icon: CheckCircle2,
  },
  change_declined: {
    label: 'Client Declined',
    color: 'text-red-700',
    Icon: XCircle,
  },
};

export function AuditTimeline({
  events,
  projects,
  changeOrders,
  selectedProjectId,
  onSelectProject,
  onInspectChangeOrder,
}: AuditTimelineProps) {
  const [filterCategory, setFilterCategory] = useState<'all' | 'agreements' | 'requests'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSummary, setCopiedSummary] = useState(false);

  const projectsById = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p])),
    [projects]
  );

  const filteredEvents = useMemo(() => {
    return [...events]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .filter((ev) => {
        if (selectedProjectId !== 'all' && ev.projectId !== selectedProjectId) return false;
        if (filterCategory === 'agreements') {
          if (
            ev.eventType !== 'baseline_signed' &&
            ev.eventType !== 'change_approved' &&
            ev.eventType !== 'change_declined'
          ) {
            return false;
          }
        }
        if (filterCategory === 'requests') {
          if (ev.eventType !== 'change_created' && ev.eventType !== 'change_sent') {
            return false;
          }
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const project = projectsById[ev.projectId];
          const haystack = [
            ev.summary,
            ev.actorName,
            ev.actorRole,
            ev.originalText ?? '',
            ev.newText ?? '',
            ev.note ?? '',
            ev.changeOrderId ?? '',
            project?.name ?? '',
            project?.clientCompany ?? '',
          ]
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      });
  }, [events, selectedProjectId, filterCategory, searchQuery, projectsById]);

  const handleDownloadCsv = () => {
    const csv = buildAuditCsv(filteredEvents, projectsById);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scope-audit-history-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyMarkdown = async () => {
    const targetProject =
      selectedProjectId !== 'all' ? projectsById[selectedProjectId] : projects[0];
    if (!targetProject) return;
    const md = buildAgreementMarkdown(targetProject, changeOrders, events);
    await navigator.clipboard.writeText(md);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Filter & Export Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200 rounded-lg p-4 no-print">
        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Filter audit log by project"
            value={selectedProjectId}
            onChange={(e) => onSelectProject(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          >
            <option value="all">All Projects ({projects.length})</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.clientCompany} — {p.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
            {(
              [
                { id: 'all', label: 'All History' },
                { id: 'agreements', label: 'Signed Agreements' },
                { id: 'requests', label: 'Requests Sent' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterCategory(tab.id)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  filterCategory === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search signer, CR ID, or requirement..."
            className="h-9 w-64 max-w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            {copiedSummary ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                <span>Copied Summary</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span>Copy Agreement Summary</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Audit Ledger List */}
      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
        {filteredEvents.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-sm font-medium text-slate-800">No matching agreement records</p>
            <p className="text-xs text-slate-500">
              Try clearing your search filter or selecting all projects.
            </p>
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const meta = EVENT_LABELS[ev.eventType];
            const Icon = meta.Icon;
            const project = projectsById[ev.projectId];

            return (
              <div key={ev.id} className="p-5 hover:bg-slate-50/70 transition-colors">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                      <span className={`inline-flex items-center gap-1.5 font-semibold ${meta.color}`}>
                        <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{meta.label}</span>
                      </span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="font-medium text-slate-700">
                        {project ? `${project.clientCompany} / ${project.name}` : ev.projectId}
                      </span>
                      {ev.changeOrderId && (
                        <>
                          <span className="text-slate-300" aria-hidden="true">·</span>
                          <button
                            type="button"
                            onClick={() => onInspectChangeOrder(ev.changeOrderId!)}
                            className="font-mono text-blue-700 hover:underline focus-visible:outline-none focus-visible:underline"
                          >
                            {ev.changeOrderId}
                          </button>
                        </>
                      )}
                    </div>

                    <p className="text-sm font-medium text-slate-900">{ev.summary}</p>

                    <div className="text-xs text-slate-500">
                      Recorded by <span className="font-medium text-slate-700">{ev.actorName}</span> ({ev.actorRole})
                    </div>
                  </div>

                  <div className="flex flex-col md:items-end gap-1 shrink-0">
                    <span className="text-xs font-mono tabular-nums text-slate-500">
                      {formatDateTime(ev.timestamp)}
                    </span>
                    <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
                      {ev.costDelta !== undefined && ev.costDelta !== 0 && (
                        <span className="text-slate-800 font-medium">
                          {formatSignedCurrency(ev.costDelta)}
                        </span>
                      )}
                      {ev.timelineDeltaDays !== undefined && ev.timelineDeltaDays > 0 && (
                        <span className="text-slate-500">+{ev.timelineDeltaDays}d</span>
                      )}
                      {ev.cumulativeBudgetAfter !== undefined && (
                        <span className="text-slate-700 font-semibold">
                          Total: {formatCurrency(ev.cumulativeBudgetAfter)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Inline Original vs Added Diff Snippet */}
                {(ev.originalText || ev.newText || ev.note) && (
                  <div className="mt-3.5 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {ev.originalText && (
                      <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="text-slate-500 font-medium mb-0.5">Original Baseline</div>
                        <div className="text-slate-700 leading-relaxed">{ev.originalText}</div>
                      </div>
                    )}
                    {ev.newText && (
                      <div
                        className={`rounded border border-slate-200 bg-white px-3 py-2 ${
                          !ev.originalText ? 'md:col-span-2' : ''
                        }`}
                      >
                        <div className="text-slate-500 font-medium mb-0.5">
                          {ev.eventType === 'baseline_signed' ? 'Locked Scope' : 'Agreed Change / Proposal'}
                        </div>
                        <div className="text-slate-900 leading-relaxed">{ev.newText}</div>
                      </div>
                    )}
                    {ev.note && (
                      <div className="md:col-span-2 rounded border border-slate-200 bg-slate-50/70 px-3 py-2 text-slate-700">
                        <span className="font-medium text-slate-900">Agreement Note: </span>
                        &ldquo;{ev.note}&rdquo;
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
