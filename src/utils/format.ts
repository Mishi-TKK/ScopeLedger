import { AuditEvent, ChangeOrder, Project } from '../types/scope';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatSignedCurrency(amount: number): string {
  const prefix = amount > 0 ? '+' : '';
  return `${prefix}${formatCurrency(amount)}`;
}

export function formatDate(iso: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(iso: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function addBusinessDays(isoDate: string, days: number): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime()) || days === 0) return isoDate;
  let remaining = Math.abs(days);
  const direction = days >= 0 ? 1 : -1;
  while (remaining > 0) {
    date.setDate(date.getDate() + direction);
    const day = date.getDay();
    if (day !== 0 && day !== 6) {
      remaining -= 1;
    }
  }
  return date.toISOString().slice(0, 10);
}

export function getProjectFinancials(project: Project, changeOrders: ChangeOrder[]) {
  const projectChanges = changeOrders.filter((c) => c.projectId === project.id);
  const approvedChanges = projectChanges.filter((c) => c.status === 'approved');
  const pendingChanges = projectChanges.filter((c) => c.status === 'pending_client');

  const approvedRevenue = approvedChanges.reduce((sum, c) => sum + c.costDelta, 0);
  const approvedDays = approvedChanges.reduce((sum, c) => sum + c.timelineDeltaDays, 0);
  const pendingRevenue = pendingChanges.reduce((sum, c) => sum + c.costDelta, 0);

  return {
    approvedCount: approvedChanges.length,
    pendingCount: pendingChanges.length,
    approvedRevenue,
    pendingRevenue,
    revisedBudget: project.originalBudget + approvedRevenue,
    revisedTargetDate: addBusinessDays(project.originalTargetDate, approvedDays),
    approvedDays,
  };
}

export function buildAuditCsv(
  events: AuditEvent[],
  projectsById: Record<string, Project>
): string {
  const headers = [
    'Timestamp',
    'Project',
    'Client',
    'Change Order ID',
    'Event Type',
    'Actor',
    'Role',
    'Summary',
    'Original Scope',
    'Added or Changed Scope',
    'Cost Delta (USD)',
    'Timeline Delta (Days)',
    'Cumulative Contract Value (USD)',
    'Note',
  ];

  const escapeCsv = (val: string | number | undefined) => {
    if (val === undefined || val === null) return '';
    const str = String(val);
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = events.map((ev) => {
    const project = projectsById[ev.projectId];
    return [
      ev.timestamp,
      project?.name ?? ev.projectId,
      project?.clientCompany ?? '',
      ev.changeOrderId ?? '',
      ev.eventType,
      ev.actorName,
      ev.actorRole,
      ev.summary,
      ev.originalText ?? '',
      ev.newText ?? '',
      ev.costDelta ?? '',
      ev.timelineDeltaDays ?? '',
      ev.cumulativeBudgetAfter ?? '',
      ev.note ?? '',
    ]
      .map(escapeCsv)
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function buildAgreementMarkdown(
  project: Project,
  changeOrders: ChangeOrder[],
  events: AuditEvent[]
): string {
  const fin = getProjectFinancials(project, changeOrders);
  const lines: string[] = [
    `# Scope & Agreement Audit Summary`,
    ``,
    `- **Project:** ${project.name}`,
    `- **Client:** ${project.clientCompany} (${project.clientContactName}, ${project.clientContactRole})`,
    `- **Provider:** ${project.providerName}`,
    `- **Original Baseline (${project.baselineVersion}):** ${formatCurrency(project.originalBudget)} · Target ${formatDate(project.originalTargetDate)} (Signed ${formatDate(project.baselineSignedAt)})`,
    `- **Approved Change Orders:** ${fin.approvedCount} (${formatSignedCurrency(fin.approvedRevenue)}, +${fin.approvedDays} business days)`,
    `- **Current Agreed Contract Value:** ${formatCurrency(fin.revisedBudget)} · Revised Target ${formatDate(fin.revisedTargetDate)}`,
    ``,
    `## Original Agreed Requirements (${project.baselineVersion})`,
    ...project.requirements.map(
      (req) => `- **${req.code} (${req.title}):** ${req.description}`
    ),
    ``,
    `## Agreement Audit History`,
    ...events
      .filter((e) => e.projectId === project.id)
      .map((e) => {
        const delta =
          e.costDelta !== undefined
            ? ` | Impact: ${formatSignedCurrency(e.costDelta)}, +${e.timelineDeltaDays ?? 0}d`
            : '';
        const note = e.note ? `\n  - *Client/Team Note:* "${e.note}"` : '';
        return `- **${formatDateTime(e.timestamp)}** — ${e.summary} (*${e.actorName}, ${e.actorRole}*)${delta}${note}`;
      }),
  ];

  return lines.join('\n');
}
