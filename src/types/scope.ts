export type ChangeOrderStatus = 'draft' | 'pending_client' | 'approved' | 'declined';

export type ChangeScopeType = 'modify_requirement' | 'net_new_scope';

export type RequestChannel = 'Slack' | 'Email' | 'Sprint Review' | 'Phone Call' | 'Client Portal';

export interface BaselineRequirement {
  id: string;
  code: string;
  title: string;
  description: string;
  category: 'Feature' | 'Integration' | 'Security' | 'Data' | 'Design';
  agreedVersion: string;
}

export interface Project {
  id: string;
  name: string;
  clientCompany: string;
  clientContactName: string;
  clientContactRole: string;
  clientContactEmail: string;
  providerName: string;
  baselineVersion: string;
  baselineSignedAt: string;
  originalBudget: number;
  originalTargetDate: string;
  requirements: BaselineRequirement[];
}

export interface ChangeOrder {
  id: string;
  projectId: string;
  title: string;
  requestedBy: string;
  requestedChannel: RequestChannel;
  changeType: ChangeScopeType;
  linkedRequirementId?: string;
  linkedRequirementCode?: string;
  originalRequirementSnapshot: string;
  proposedChange: string;
  technicalImpact: string;
  costDelta: number;
  timelineDeltaDays: number;
  status: ChangeOrderStatus;
  createdAt: string;
  sentAt?: string;
  resolvedAt?: string;
  resolvedByName?: string;
  resolvedByRole?: string;
  clientComment?: string;
}

export type AuditEventType =
  | 'baseline_signed'
  | 'baseline_updated'
  | 'change_created'
  | 'change_sent'
  | 'change_approved'
  | 'change_declined';

export interface AuditEvent {
  id: string;
  projectId: string;
  changeOrderId?: string;
  eventType: AuditEventType;
  actorName: string;
  actorRole: string;
  timestamp: string;
  summary: string;
  originalText?: string;
  newText?: string;
  costDelta?: number;
  timelineDeltaDays?: number;
  cumulativeBudgetAfter?: number;
  note?: string;
}
