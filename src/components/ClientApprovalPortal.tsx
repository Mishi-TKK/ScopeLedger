import {
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import { AuditEvent, ChangeOrder, Project } from '../types/scope';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatSignedCurrency,
  getProjectFinancials,
} from '../utils/format';
import { DiffComparison } from './DiffComparison';
import { StatusLabel } from './StatusLabel';

interface ClientApprovalPortalProps {
  changeOrder: ChangeOrder;
  project: Project;
  allProjectChanges: ChangeOrder[];
  projectAuditEvents: AuditEvent[];
  onBackToWorkspace?: () => void;
  onResolve: (
    changeOrderId: string,
    decision: 'approved' | 'declined',
    signerName: string,
    signerRole: string,
    comment: string
  ) => void;
}

export function ClientApprovalPortal({
  changeOrder,
  project,
  allProjectChanges,
  projectAuditEvents,
  onBackToWorkspace,
  onResolve,
}: ClientApprovalPortalProps) {
  const [signerName, setSignerName] = useState(project.clientContactName);
  const [signerRole, setSignerRole] = useState(project.clientContactRole);
  const [comment, setComment] = useState('');

  const financials = getProjectFinancials(project, allProjectChanges);
  const isResolved = changeOrder.status === 'approved' || changeOrder.status === 'declined';

  const priorAgreements = projectAuditEvents
    .filter(
      (e) =>
        e.eventType === 'baseline_signed' ||
        e.eventType === 'change_approved' ||
        e.eventType === 'change_declined'
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleDecision = (decision: 'approved' | 'declined', e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!signerName.trim()) return;
    onResolve(
      changeOrder.id,
      decision,
      signerName.trim(),
      signerRole.trim() || 'Authorized Signer',
      comment.trim()
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Clean Client Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
              {project.providerName}
            </span>
            <span className="text-slate-300" aria-hidden="true">/</span>
            <span className="text-xs text-slate-500 truncate">
              Client Change-Order Approval
            </span>
          </div>

          {onBackToWorkspace && (
            <button
              type="button"
              onClick={onBackToWorkspace}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Exit Client Preview</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Document Summary Header */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-mono font-medium text-slate-700">{changeOrder.id}</span>
                <span aria-hidden="true">·</span>
                <span>{project.clientCompany}</span>
                <span aria-hidden="true">·</span>
                <span>{project.name}</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {changeOrder.title}
              </h1>
              <p className="text-xs text-slate-500">
                Requested by {changeOrder.requestedBy} via {changeOrder.requestedChannel} · Created{' '}
                {formatDate(changeOrder.createdAt)}
              </p>
            </div>
            <div className="shrink-0 pt-1">
              <StatusLabel status={changeOrder.status} />
            </div>
          </div>

          {/* Side-by-Side Original vs Proposed Diff */}
          <DiffComparison
            changeOrder={changeOrder}
            project={project}
            currentApprovedBudget={financials.revisedBudget}
            currentTargetDate={financials.revisedTargetDate}
          />

          {/* Interactive Sign-off OR Signed Receipt */}
          {isResolved ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                {changeOrder.status === 'approved' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-700 shrink-0" aria-hidden="true" />
                )}
                <span>
                  {changeOrder.status === 'approved'
                    ? 'Agreement Approved & Logged in Audit History'
                    : 'Change Order Declined — Original Scope Preserved'}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Signed by <span className="font-medium text-slate-900">{changeOrder.resolvedByName}</span> (
                {changeOrder.resolvedByRole}) on{' '}
                <span className="font-mono tabular-nums">
                  {formatDateTime(changeOrder.resolvedAt || '')}
                </span>
              </p>
              {changeOrder.clientComment && (
                <p className="text-xs text-slate-700 pt-1">
                  <span className="font-medium text-slate-900">Client Note: </span>
                  &ldquo;{changeOrder.clientComment}&rdquo;
                </p>
              )}
            </div>
          ) : (
            <form
              onSubmit={(e) => handleDecision('approved', e)}
              className="border-t border-slate-200 pt-6 space-y-4"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <FileCheck2 className="w-4 h-4 text-slate-600" aria-hidden="true" />
                <span>Authorize Scope & Budget Update</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-slate-700">Your Full Name</span>
                  <input
                    type="text"
                    required
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-slate-700">Title / Role</span>
                  <input
                    type="text"
                    required
                    value={signerRole}
                    onChange={(e) => setSignerRole(e.target.value)}
                    className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-700">
                  Optional Approval Note or Revision Feedback
                </span>
                <textarea
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="e.g., Approved for Q4 sprint; please prioritize staging deploy first."
                  className="w-full rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </label>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <p className="text-xs text-slate-500">
                  Approving records a timestamped entry in the project agreement audit history.
                </p>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDecision('declined')}
                    className="h-10 px-4 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                  >
                    Decline Change
                  </button>
                  <button
                    type="submit"
                    className="h-10 px-5 rounded-md bg-blue-700 text-sm font-medium text-white hover:bg-blue-800 transition-colors whitespace-nowrap"
                  >
                    Approve Change ({formatSignedCurrency(changeOrder.costDelta)})
                  </button>
                </div>
              </div>
            </form>
          )}
        </section>

        {/* Prior Agreement Audit Trail for Client Transparency */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-600" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-slate-900">
                Prior Project Agreements Audit Trail
              </h2>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-600">
              Current Agreed Total: {formatCurrency(financials.revisedBudget)}
            </span>
          </div>

          <div className="divide-y divide-slate-200">
            {priorAgreements.map((ev) => (
              <div key={ev.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="space-y-0.5">
                  <div className="font-medium text-slate-900">{ev.summary}</div>
                  <div className="text-slate-500">
                    Signed by {ev.actorName} ({ev.actorRole})
                  </div>
                </div>
                <div className="flex items-center gap-3 font-mono tabular-nums text-slate-600 shrink-0">
                  {ev.cumulativeBudgetAfter !== undefined && (
                    <span>Total: {formatCurrency(ev.cumulativeBudgetAfter)}</span>
                  )}
                  <span className="text-slate-400">{formatDate(ev.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
