import {
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  FileDiff,
  FolderKanban,
  History,
  Menu,
  Plus,
  RotateCcw,
  Send,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AuditTimeline } from './components/AuditTimeline';
import { ClientApprovalPortal } from './components/ClientApprovalPortal';
import { DiffComparison } from './components/DiffComparison';
import { NewChangeOrderModal } from './components/NewChangeOrderModal';
import { ProjectBaselineModal } from './components/ProjectBaselineModal';
import { StatusLabel } from './components/StatusLabel';
import {
  INITIAL_AUDIT_EVENTS,
  INITIAL_CHANGE_ORDERS,
  INITIAL_PROJECTS,
} from './data/seedData';
import {
  AuditEvent,
  BaselineRequirement,
  ChangeOrder,
  ChangeOrderStatus,
  ChangeScopeType,
  Project,
  RequestChannel,
} from './types/scope';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatSignedCurrency,
  getProjectFinancials,
} from './utils/format';

type WorkspaceTab = 'change_orders' | 'projects' | 'audit';

const STORAGE_KEY = 'scopeledger_state_v1';

interface StoredState {
  projects: Project[];
  changeOrders: ChangeOrder[];
  auditEvents: AuditEvent[];
}

function loadInitialState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredState;
      if (
        Array.isArray(parsed.projects) &&
        Array.isArray(parsed.changeOrders) &&
        Array.isArray(parsed.auditEvents)
      ) {
        return parsed;
      }
    }
  } catch {
    // Fallback to seed data if storage is unavailable
  }
  return {
    projects: INITIAL_PROJECTS,
    changeOrders: INITIAL_CHANGE_ORDERS,
    auditEvents: INITIAL_AUDIT_EVENTS,
  };
}

export default function App() {
  const initial = useMemo(() => loadInitialState(), []);
  const [projects, setProjects] = useState<Project[]>(initial.projects);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>(initial.changeOrders);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(initial.auditEvents);

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('change_orders');
  const [auditReturnTab, setAuditReturnTab] = useState<'projects' | 'change_orders' | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | ChangeOrderStatus>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChangeId, setSelectedChangeId] = useState<string>(
    initial.changeOrders[1]?.id || initial.changeOrders[0]?.id || ''
  );
  const [activeProjectId, setActiveProjectId] = useState<string>(initial.projects[0]?.id || '');

  const [clientPreviewChangeId, setClientPreviewChangeId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('approve');
  });

  const [isNewChangeOpen, setIsNewChangeOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Add-requirement inline form on Projects & Baselines view
  const [addingReqTitle, setAddingReqTitle] = useState('');
  const [addingReqDesc, setAddingReqDesc] = useState('');
  const [addingReqCategory, setAddingReqCategory] =
    useState<BaselineRequirement['category']>('Feature');

  // Persist to localStorage & sync across browser tabs
  useEffect(() => {
    const payload: StoredState = { projects, changeOrders, auditEvents };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }
  }, [projects, changeOrders, auditEvents]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as StoredState;
          setProjects(parsed.projects);
          setChangeOrders(parsed.changeOrders);
          setAuditEvents(parsed.auditEvents);
        } catch {
          // Ignore malformed event
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const projectsById = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p])),
    [projects]
  );

  // KPI computations
  const kpis = useMemo(() => {
    const approved = changeOrders.filter((c) => c.status === 'approved');
    const pending = changeOrders.filter((c) => c.status === 'pending_client');
    const declined = changeOrders.filter((c) => c.status === 'declined');

    const capturedRevenue = approved.reduce((sum, c) => sum + c.costDelta, 0);
    const pendingRevenue = pending.reduce((sum, c) => sum + c.costDelta, 0);
    const declinedValue = declined.reduce((sum, c) => sum + c.costDelta, 0);

    return {
      capturedRevenue,
      approvedCount: approved.length,
      pendingRevenue,
      pendingCount: pending.length,
      declinedCount: declined.length,
      declinedValue,
    };
  }, [changeOrders]);

  const filteredChangeOrders = useMemo(() => {
    return changeOrders.filter((co) => {
      if (statusFilter !== 'all' && co.status !== statusFilter) return false;
      if (projectFilter !== 'all' && co.projectId !== projectFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const proj = projectsById[co.projectId];
        const hay = [
          co.id,
          co.title,
          co.requestedBy,
          co.proposedChange,
          co.originalRequirementSnapshot,
          proj?.name ?? '',
          proj?.clientCompany ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [changeOrders, statusFilter, projectFilter, searchQuery, projectsById]);

  const selectedChangeOrder = useMemo(
    () =>
      changeOrders.find((c) => c.id === selectedChangeId) ||
      filteredChangeOrders[0] ||
      changeOrders[0],
    [changeOrders, selectedChangeId, filteredChangeOrders]
  );

  const selectedProjectForChange = selectedChangeOrder
    ? projectsById[selectedChangeOrder.projectId]
    : undefined;

  const activeProject = useMemo(
    () => projectsById[activeProjectId] || projects[0],
    [projectsById, activeProjectId, projects]
  );

  const handleCopyApprovalLink = async (changeOrderId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('approve', changeOrderId);
    await navigator.clipboard.writeText(url.toString());
    setCopiedLinkId(changeOrderId);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  const handleOpenClientPreview = (changeOrderId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('approve', changeOrderId);
    window.history.replaceState({}, '', url.toString());
    setClientPreviewChangeId(changeOrderId);
  };

  const handleExitClientPreview = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('approve');
    window.history.replaceState({}, '', url.toString());
    setClientPreviewChangeId(null);
  };

  const handleSendToClient = (changeOrderId: string) => {
    const target = changeOrders.find((c) => c.id === changeOrderId);
    if (!target) return;
    const now = new Date().toISOString();

    setChangeOrders((prev) =>
      prev.map((co) =>
        co.id === changeOrderId ? { ...co, status: 'pending_client', sentAt: now } : co
      )
    );

    setAuditEvents((prev) => [
      ...prev,
      {
        id: `aud-${Date.now()}`,
        projectId: target.projectId,
        changeOrderId: target.id,
        eventType: 'change_sent',
        actorName: 'Alex Rivera',
        actorRole: 'Project Lead',
        timestamp: now,
        summary: `${target.id} sent to client for approval (${target.title})`,
        originalText: target.originalRequirementSnapshot,
        newText: target.proposedChange,
        costDelta: target.costDelta,
        timelineDeltaDays: target.timelineDeltaDays,
      },
    ]);
  };

  const handleResolveChangeOrder = (
    changeOrderId: string,
    decision: 'approved' | 'declined',
    signerName: string,
    signerRole: string,
    comment: string
  ) => {
    const target = changeOrders.find((c) => c.id === changeOrderId);
    if (!target) return;
    const project = projectsById[target.projectId];
    if (!project) return;

    const now = new Date().toISOString();
    const updatedChanges = changeOrders.map((co) =>
      co.id === changeOrderId
        ? {
            ...co,
            status: decision,
            resolvedAt: now,
            resolvedByName: signerName,
            resolvedByRole: signerRole,
            clientComment: comment || undefined,
          }
        : co
    );

    const newFin = getProjectFinancials(project, updatedChanges);

    setChangeOrders(updatedChanges);
    setAuditEvents((prev) => [
      ...prev,
      {
        id: `aud-${Date.now()}`,
        projectId: target.projectId,
        changeOrderId: target.id,
        eventType: decision === 'approved' ? 'change_approved' : 'change_declined',
        actorName: signerName,
        actorRole: signerRole,
        timestamp: now,
        summary:
          decision === 'approved'
            ? `${target.id} approved by client — scope & budget updated (${target.title})`
            : `${target.id} declined by client — original baseline preserved (${target.title})`,
        originalText: target.originalRequirementSnapshot,
        newText: target.proposedChange,
        costDelta: decision === 'approved' ? target.costDelta : 0,
        timelineDeltaDays: decision === 'approved' ? target.timelineDeltaDays : 0,
        cumulativeBudgetAfter: newFin.revisedBudget,
        note: comment || undefined,
      },
    ]);
  };

  const handleCreateChangeOrder = (payload: {
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
    sendImmediately: boolean;
  }) => {
    const now = new Date().toISOString();
    const nextNum =
      changeOrders.reduce((max, c) => {
        const num = Number(c.id.replace('CR-', ''));
        return Number.isFinite(num) && num > max ? num : max;
      }, 100) + 1;
    const newId = `CR-${nextNum}`;

    const newCo: ChangeOrder = {
      id: newId,
      projectId: payload.projectId,
      title: payload.title,
      requestedBy: payload.requestedBy,
      requestedChannel: payload.requestedChannel,
      changeType: payload.changeType,
      linkedRequirementId: payload.linkedRequirementId,
      linkedRequirementCode: payload.linkedRequirementCode,
      originalRequirementSnapshot: payload.originalRequirementSnapshot,
      proposedChange: payload.proposedChange,
      technicalImpact: payload.technicalImpact,
      costDelta: payload.costDelta,
      timelineDeltaDays: payload.timelineDeltaDays,
      status: payload.sendImmediately ? 'pending_client' : 'draft',
      createdAt: now,
      sentAt: payload.sendImmediately ? now : undefined,
    };

    setChangeOrders((prev) => [newCo, ...prev]);
    setAuditEvents((prev) => [
      ...prev,
      {
        id: `aud-${Date.now()}`,
        projectId: payload.projectId,
        changeOrderId: newId,
        eventType: payload.sendImmediately ? 'change_sent' : 'change_created',
        actorName: 'Alex Rivera',
        actorRole: 'Project Lead',
        timestamp: now,
        summary: payload.sendImmediately
          ? `${newId} created & sent for client approval (${payload.title})`
          : `${newId} drafted (${payload.title})`,
        originalText: payload.originalRequirementSnapshot,
        newText: payload.proposedChange,
        costDelta: payload.costDelta,
        timelineDeltaDays: payload.timelineDeltaDays,
      },
    ]);

    setActiveTab('change_orders');
    setSelectedChangeId(newId);
  };

  const handleCreateProject = (payload: {
    name: string;
    clientCompany: string;
    clientContactName: string;
    clientContactRole: string;
    clientContactEmail: string;
    providerName: string;
    originalBudget: number;
    originalTargetDate: string;
    requirements: Omit<BaselineRequirement, 'id' | 'agreedVersion'>[];
  }) => {
    const now = new Date().toISOString();
    const projId = `proj-${Date.now()}`;
    const newReqs: BaselineRequirement[] = payload.requirements.map((r, i) => ({
      ...r,
      id: `req-${Date.now()}-${i}`,
      agreedVersion: 'v1.0',
    }));

    const newProj: Project = {
      id: projId,
      name: payload.name,
      clientCompany: payload.clientCompany,
      clientContactName: payload.clientContactName,
      clientContactRole: payload.clientContactRole,
      clientContactEmail: payload.clientContactEmail,
      providerName: payload.providerName,
      baselineVersion: 'v1.0',
      baselineSignedAt: now,
      originalBudget: payload.originalBudget,
      originalTargetDate: payload.originalTargetDate,
      requirements: newReqs,
    };

    setProjects((prev) => [...prev, newProj]);
    setAuditEvents((prev) => [
      ...prev,
      {
        id: `aud-${Date.now()}`,
        projectId: projId,
        eventType: 'baseline_signed',
        actorName: payload.clientContactName,
        actorRole: `${payload.clientContactRole} (${payload.clientCompany})`,
        timestamp: now,
        summary: `Original Scope Baseline v1.0 signed (${newReqs.length} core requirements)`,
        newText: `${newReqs.map((r) => r.code).join(', ')} locked at ${formatCurrency(
          payload.originalBudget
        )} · Target ${formatDate(payload.originalTargetDate)}`,
        cumulativeBudgetAfter: payload.originalBudget,
      },
    ]);
    setActiveProjectId(projId);
    setActiveTab('projects');
  };

  const handleAppendBaselineRequirement = (projectId: string) => {
    if (!addingReqTitle.trim() || !addingReqDesc.trim()) return;
    const project = projectsById[projectId];
    if (!project) return;
    const nextNum = String(project.requirements.length + 1).padStart(2, '0');
    const code = `REQ-${nextNum}`;
    const now = new Date().toISOString();

    const newReq: BaselineRequirement = {
      id: `req-${Date.now()}`,
      code,
      title: addingReqTitle.trim(),
      description: addingReqDesc.trim(),
      category: addingReqCategory,
      agreedVersion: project.baselineVersion,
    };

    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, requirements: [...p.requirements, newReq] } : p
      )
    );
    setAuditEvents((prev) => [
      ...prev,
      {
        id: `aud-${Date.now()}`,
        projectId,
        eventType: 'baseline_updated',
        actorName: 'Alex Rivera',
        actorRole: 'Project Lead',
        timestamp: now,
        summary: `Added ${code} (${newReq.title}) to Baseline ${project.baselineVersion}`,
        newText: `${code}: ${newReq.description}`,
      },
    ]);
    setAddingReqTitle('');
    setAddingReqDesc('');
  };

  const handleResetDemoData = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3500);
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    setProjects(INITIAL_PROJECTS);
    setChangeOrders(INITIAL_CHANGE_ORDERS);
    setAuditEvents(INITIAL_AUDIT_EVENTS);
    setSelectedChangeId(INITIAL_CHANGE_ORDERS[1].id);
    setActiveProjectId(INITIAL_PROJECTS[0].id);
    setConfirmReset(false);
  };

  // Dedicated zero-login Client Approval Portal View
  if (clientPreviewChangeId) {
    const targetCo = changeOrders.find((c) => c.id === clientPreviewChangeId);
    const targetProj = targetCo ? projectsById[targetCo.projectId] : undefined;

    if (targetCo && targetProj) {
      return (
        <ClientApprovalPortal
          changeOrder={targetCo}
          project={targetProj}
          allProjectChanges={changeOrders.filter((c) => c.projectId === targetProj.id)}
          projectAuditEvents={auditEvents.filter((e) => e.projectId === targetProj.id)}
          onBackToWorkspace={handleExitClientPreview}
          onResolve={handleResolveChangeOrder}
        />
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 text-center space-y-4">
          <h1 className="text-lg font-semibold text-slate-900">Change Order Not Found</h1>
          <p className="text-sm text-slate-600">
            The link <span className="font-mono">{clientPreviewChangeId}</span> does not match an
            active record in this browser workspace.
          </p>
          <button
            type="button"
            onClick={handleExitClientPreview}
            className="h-10 px-4 rounded-md bg-slate-900 text-sm font-medium text-white hover:bg-slate-800"
          >
            Return to Workspace
          </button>
        </div>
      </div>
    );
  }

  const breadcrumbLabel =
    activeTab === 'change_orders'
      ? 'Change Orders & Scope Diffs'
      : activeTab === 'projects'
      ? `Projects & Baselines / ${activeProject?.name ?? ''}`
      : 'Agreement Audit History';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white no-print">
        <div>
          <div className="h-16 px-6 flex items-center border-b border-slate-200">
            <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
              ScopeLedger
            </span>
          </div>

          <nav className="p-3 space-y-1" aria-label="Workspace navigation">
            <button
              type="button"
              onClick={() => {
                setAuditReturnTab(null);
                setActiveTab('change_orders');
              }}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'change_orders'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <FileDiff className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Change Orders</span>
              </span>
              <span className="font-mono tabular-nums text-xs text-slate-500">
                {changeOrders.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuditReturnTab(null);
                setActiveTab('projects');
              }}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'projects'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <FolderKanban className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Projects & Baselines</span>
              </span>
              <span className="font-mono tabular-nums text-xs text-slate-500">
                {projects.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuditReturnTab(null);
                setActiveTab('audit');
              }}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'audit'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <History className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Audit History</span>
              </span>
              <span className="font-mono tabular-nums text-xs text-slate-500">
                {auditEvents.length}
              </span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200 space-y-3">
          <button
            type="button"
            onClick={handleResetDemoData}
            className="w-full flex items-center justify-center gap-2 h-9 px-3 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{confirmReset ? 'Click again to confirm reset' : 'Reset Demo Data'}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] bg-white border-r border-slate-200 flex flex-col justify-between z-10">
            <div>
              <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200">
                <span className="font-display text-lg font-bold text-slate-900">ScopeLedger</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close navigation"
                  className="p-2 text-slate-500 hover:text-slate-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="p-3 space-y-1">
                {(
                  [
                    { id: 'change_orders', label: 'Change Orders', Icon: FileDiff },
                    { id: 'projects', label: 'Projects & Baselines', Icon: FolderKanban },
                    { id: 'audit', label: 'Audit History', Icon: History },
                  ] as const
                ).map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setAuditReturnTab(null);
                      setActiveTab(id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium ${
                      activeTab === id ? 'bg-slate-100 text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                ))}
              </nav>
            </div>
            <div className="p-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleResetDemoData}
                className="w-full flex items-center justify-center gap-2 h-9 px-3 rounded-md border border-slate-200 text-xs font-medium text-slate-600"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{confirmReset ? 'Confirm Reset' : 'Reset Demo Data'}</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumbs Left, 1-2 Actions Right */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-8 sticky top-0 z-30 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="font-semibold text-slate-900 whitespace-nowrap shrink-0 lg:hidden">
                ScopeLedger
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 lg:hidden" aria-hidden="true" />
              <span className="text-slate-600 truncate">{breadcrumbLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {activeTab === 'projects' && (
              <button
                type="button"
                onClick={() => setIsNewProjectOpen(true)}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>New Project Baseline</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsNewChangeOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-slate-900 text-xs font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>New Change Order</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* VIEW 1: CHANGE ORDERS & DIFF INSPECTOR */}
          {activeTab === 'change_orders' && (
            <>
              {/* 4-Column Hairline-Divided KPI Strip */}
              <section
                aria-label="Scope revenue summary"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-slate-200"
              >
                <div className="p-4 space-y-1">
                  <div className="text-xs text-slate-500">Captured Change Revenue</div>
                  <div className="text-xl font-semibold font-mono tabular-nums text-slate-900">
                    {formatCurrency(kpis.capturedRevenue)}
                  </div>
                  <div className="text-xs text-emerald-700 font-medium">
                    {kpis.approvedCount} approved change orders
                  </div>
                </div>

                <div className="p-4 space-y-1">
                  <div className="text-xs text-slate-500">Pending Client Approval</div>
                  <div className="text-xl font-semibold font-mono tabular-nums text-slate-900">
                    {formatCurrency(kpis.pendingRevenue)}
                  </div>
                  <div className="text-xs text-amber-700 font-medium">
                    {kpis.pendingCount} awaiting sign-off
                  </div>
                </div>

                <div className="p-4 space-y-1">
                  <div className="text-xs text-slate-500">Declined / Deferred Scope</div>
                  <div className="text-xl font-semibold font-mono tabular-nums text-slate-900">
                    {formatCurrency(kpis.declinedValue)}
                  </div>
                  <div className="text-xs text-slate-600">
                    {kpis.declinedCount} kept out of unpaid work
                  </div>
                </div>

                <div className="p-4 space-y-1">
                  <div className="text-xs text-slate-500">Active Client Projects</div>
                  <div className="text-xl font-semibold font-mono tabular-nums text-slate-900">
                    {projects.length}
                  </div>
                  <div className="text-xs text-slate-600">
                    {auditEvents.length} logged audit entries
                  </div>
                </div>
              </section>

              {/* Filter & Search Toolbar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                    {(
                      [
                        { id: 'all', label: 'All' },
                        { id: 'pending_client', label: 'Pending' },
                        { id: 'approved', label: 'Approved' },
                        { id: 'declined', label: 'Declined' },
                        { id: 'draft', label: 'Draft' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setStatusFilter(tab.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                          statusFilter === tab.id
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <select
                    aria-label="Filter change orders by project"
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                    className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  >
                    <option value="all">All Projects</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.clientCompany} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search CR ID, title, or requirement..."
                  className="h-9 w-full lg:w-72 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              {/* High-Density Change Orders Data Grid */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                {filteredChangeOrders.length === 0 ? (
                  <div className="p-10 text-center space-y-3">
                    <p className="text-sm font-medium text-slate-800">
                      No change orders match your current filters
                    </p>
                    <p className="text-xs text-slate-500">
                      Create a new change order to compare against original baseline requirements.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsNewChangeOpen(true)}
                      className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-slate-900 text-xs font-medium text-white hover:bg-slate-800"
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>New Change Order</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                          <th className="py-2.5 px-4 whitespace-nowrap">ID</th>
                          <th className="py-2.5 px-4">Change Request</th>
                          <th className="py-2.5 px-4 whitespace-nowrap">Project / Client</th>
                          <th className="py-2.5 px-4 whitespace-nowrap">Baseline Ref</th>
                          <th className="py-2.5 px-4 whitespace-nowrap">Status</th>
                          <th className="py-2.5 px-4 text-right whitespace-nowrap">Cost Delta</th>
                          <th className="py-2.5 px-4 text-right whitespace-nowrap">Schedule</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-sm">
                        {filteredChangeOrders.map((co) => {
                          const proj = projectsById[co.projectId];
                          const isSelected = selectedChangeOrder?.id === co.id;
                          return (
                            <tr
                              key={co.id}
                              onClick={() => setSelectedChangeId(co.id)}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="py-2.5 px-4 font-mono text-xs font-medium text-slate-700 whitespace-nowrap">
                                {co.id}
                              </td>
                              <td className="py-2.5 px-4 font-medium text-slate-900 max-w-xs truncate">
                                {co.title}
                              </td>
                              <td className="py-2.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                                {proj?.clientCompany} · {proj?.name}
                              </td>
                              <td className="py-2.5 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                                {co.linkedRequirementCode || 'Net-New'}
                              </td>
                              <td className="py-2.5 px-4 whitespace-nowrap">
                                <StatusLabel status={co.status} />
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs font-medium text-slate-900 whitespace-nowrap">
                                {formatSignedCurrency(co.costDelta)}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs text-slate-600 whitespace-nowrap">
                                +{co.timelineDeltaDays}d
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Selected Change Order Inspector: Side-by-Side Diff & Client Portal Actions */}
              {selectedChangeOrder && selectedProjectForChange && (
                <section
                  aria-label="Selected change order details"
                  className="bg-white border border-slate-200 rounded-lg p-6 space-y-6"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-slate-200 pb-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono font-semibold text-slate-800">
                          {selectedChangeOrder.id}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{selectedProjectForChange.clientCompany}</span>
                        <span aria-hidden="true">·</span>
                        <span>Requested via {selectedChangeOrder.requestedChannel}</span>
                        <span aria-hidden="true">·</span>
                        <StatusLabel status={selectedChangeOrder.status} />
                      </div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        {selectedChangeOrder.title}
                      </h2>
                      <p className="text-xs text-slate-500">
                        Requested by {selectedChangeOrder.requestedBy} on{' '}
                        {formatDateTime(selectedChangeOrder.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      {selectedChangeOrder.status === 'draft' && (
                        <button
                          type="button"
                          onClick={() => handleSendToClient(selectedChangeOrder.id)}
                          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-blue-700 text-xs font-medium text-white hover:bg-blue-800 transition-colors whitespace-nowrap"
                        >
                          <Send className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Send for Client Approval</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCopyApprovalLink(selectedChangeOrder.id)}
                        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                      >
                        {copiedLinkId === selectedChangeOrder.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                            <span>Approval Link Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                            <span>Copy Client Approval Link</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenClientPreview(selectedChangeOrder.id)}
                        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-slate-900 text-xs font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
                      >
                        <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Open Client Approval View</span>
                      </button>
                    </div>
                  </div>

                  {/* Original vs Added Diff */}
                  <DiffComparison
                    changeOrder={selectedChangeOrder}
                    project={selectedProjectForChange}
                    currentApprovedBudget={
                      getProjectFinancials(
                        selectedProjectForChange,
                        changeOrders.filter((c) => c.projectId === selectedProjectForChange.id)
                      ).revisedBudget
                    }
                    currentTargetDate={
                      getProjectFinancials(
                        selectedProjectForChange,
                        changeOrders.filter((c) => c.projectId === selectedProjectForChange.id)
                      ).revisedTargetDate
                    }
                  />

                  {/* Agreement Resolution Banner if already resolved */}
                  {(selectedChangeOrder.status === 'approved' ||
                    selectedChangeOrder.status === 'declined') && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 space-y-1">
                      <div className="font-semibold text-slate-900">
                        Agreement Record ({selectedChangeOrder.status === 'approved' ? 'Approved' : 'Declined'})
                      </div>
                      <div>
                        Signed by{' '}
                        <span className="font-medium text-slate-900">
                          {selectedChangeOrder.resolvedByName}
                        </span>{' '}
                        ({selectedChangeOrder.resolvedByRole}) on{' '}
                        <span className="font-mono tabular-nums">
                          {formatDateTime(selectedChangeOrder.resolvedAt || '')}
                        </span>
                      </div>
                      {selectedChangeOrder.clientComment && (
                        <div className="text-slate-600 pt-0.5">
                          Client Note: &ldquo;{selectedChangeOrder.clientComment}&rdquo;
                        </div>
                      )}
                    </div>
                  )}

                  {/* Per-Change Audit Events */}
                  <div className="border-t border-slate-200 pt-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-slate-700">
                        Audit Trail for {selectedChangeOrder.id}
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setProjectFilter(selectedProjectForChange.id);
                          setAuditReturnTab('change_orders');
                          setActiveTab('audit');
                        }}
                        className="text-xs font-medium text-blue-700 hover:underline"
                      >
                        View Full Project History
                      </button>
                    </div>

                    <div className="divide-y divide-slate-200 border border-slate-200 rounded-md">
                      {auditEvents
                        .filter((e) => e.changeOrderId === selectedChangeOrder.id)
                        .sort(
                          (a, b) =>
                            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                        )
                        .map((ev) => (
                          <div
                            key={ev.id}
                            className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div>
                              <span className="font-medium text-slate-900">{ev.summary}</span>
                              <span className="text-slate-500">
                                {' '}
                                — {ev.actorName} ({ev.actorRole})
                              </span>
                            </div>
                            <span className="font-mono tabular-nums text-slate-500 shrink-0">
                              {formatDateTime(ev.timestamp)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </section>
              )}
            </>
          )}

          {/* VIEW 2: PROJECTS & ORIGINAL REQUIREMENTS BASELINES */}
          {activeTab === 'projects' && activeProject && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Project List */}
              <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Client Projects</span>
                  <button
                    type="button"
                    onClick={() => setIsNewProjectOpen(true)}
                    className="text-xs font-medium text-blue-700 hover:underline"
                  >
                    + Add Project
                  </button>
                </div>
                {projects.map((p) => {
                  const fin = getProjectFinancials(p, changeOrders);
                  const isActive = p.id === activeProject.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setActiveProjectId(p.id)}
                      className={`w-full text-left p-4 transition-colors space-y-1.5 ${
                        isActive ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900 truncate">
                          {p.name}
                        </span>
                        <span className="font-mono text-xs text-slate-500 shrink-0">
                          {p.baselineVersion}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">{p.clientCompany}</div>
                      <div className="flex items-center justify-between text-xs font-mono tabular-nums pt-1">
                        <span className="text-slate-700">
                          Base {formatCurrency(p.originalBudget)}
                        </span>
                        <span className="text-emerald-700 font-medium">
                          Now {formatCurrency(fin.revisedBudget)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Right Baseline Details & Original Requirements Registry */}
              <div className="lg:col-span-8 space-y-6">
                {(() => {
                  const fin = getProjectFinancials(activeProject, changeOrders);
                  const projChanges = changeOrders.filter(
                    (c) => c.projectId === activeProject.id
                  );

                  return (
                    <>
                      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-4">
                          <div className="space-y-1">
                            <div className="text-xs text-slate-500">
                              {activeProject.clientCompany} · Contact: {activeProject.clientContactName} (
                              {activeProject.clientContactRole})
                            </div>
                            <h1 className="text-xl font-bold text-slate-900">
                              {activeProject.name}
                            </h1>
                            <div className="text-xs text-slate-500">
                              Baseline {activeProject.baselineVersion} signed{' '}
                              {formatDate(activeProject.baselineSignedAt)}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setProjectFilter(activeProject.id);
                              setAuditReturnTab('projects');
                              setActiveTab('audit');
                            }}
                            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 shrink-0"
                          >
                            <History className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>View Agreement Audit</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                          <div className="space-y-1">
                            <div className="text-slate-500">Original Budget</div>
                            <div className="text-base font-semibold font-mono tabular-nums text-slate-900">
                              {formatCurrency(activeProject.originalBudget)}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-slate-500">Approved Additions</div>
                            <div className="text-base font-semibold font-mono tabular-nums text-emerald-700">
                              {formatSignedCurrency(fin.approvedRevenue)}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-slate-500">Current Agreed Total</div>
                            <div className="text-base font-semibold font-mono tabular-nums text-slate-900">
                              {formatCurrency(fin.revisedBudget)}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-slate-500">Target Delivery</div>
                            <div className="text-base font-semibold font-mono tabular-nums text-slate-900">
                              {formatDate(fin.revisedTargetDate)}
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* Original Agreed Requirements Table */}
                      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <h2 className="text-sm font-semibold text-slate-900">
                              Original Agreed Requirements ({activeProject.baselineVersion})
                            </h2>
                            <p className="text-xs text-slate-500">
                              Locked baseline specification used as the &ldquo;Before&rdquo; reference
                              when evaluating new client requests.
                            </p>
                          </div>
                          <span className="font-mono text-xs text-slate-500 shrink-0">
                            {activeProject.requirements.length} items
                          </span>
                        </div>

                        <div className="divide-y divide-slate-200 border border-slate-200 rounded-md">
                          {activeProject.requirements.map((req) => {
                            const linkedCoCount = projChanges.filter(
                              (c) => c.linkedRequirementId === req.id
                            ).length;
                            return (
                              <div key={req.id} className="p-4 space-y-1.5">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="font-mono text-xs font-semibold text-slate-700">
                                      {req.code}
                                    </span>
                                    <span className="font-semibold text-slate-900">
                                      {req.title}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
                                    <span>{req.category}</span>
                                    {linkedCoCount > 0 && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span className="text-blue-700 font-medium">
                                          {linkedCoCount} change{linkedCoCount > 1 ? 's' : ''}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                  {req.description}
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        {/* Append Requirement to Baseline */}
                        <div className="border-t border-slate-200 pt-4 space-y-3">
                          <div className="text-xs font-semibold text-slate-800">
                            Add Baseline Requirement
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <input
                              type="text"
                              value={addingReqTitle}
                              onChange={(e) => setAddingReqTitle(e.target.value)}
                              placeholder="Requirement title"
                              className="sm:col-span-2 h-9 rounded-md border border-slate-200 px-3 text-xs text-slate-900"
                            />
                            <select
                              value={addingReqCategory}
                              onChange={(e) =>
                                setAddingReqCategory(
                                  e.target.value as BaselineRequirement['category']
                                )
                              }
                              className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700"
                            >
                              <option value="Feature">Feature</option>
                              <option value="Integration">Integration</option>
                              <option value="Security">Security</option>
                              <option value="Data">Data</option>
                              <option value="Design">Design</option>
                            </select>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <input
                              type="text"
                              value={addingReqDesc}
                              onChange={(e) => setAddingReqDesc(e.target.value)}
                              placeholder="Exact agreed boundary (what is included vs excluded)..."
                              className="flex-1 h-9 rounded-md border border-slate-200 px-3 text-xs text-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => handleAppendBaselineRequirement(activeProject.id)}
                              className="h-9 px-4 rounded-md bg-slate-900 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                            >
                              Add to Baseline
                            </button>
                          </div>
                        </div>
                      </section>

                      {/* Linked Change Orders on This Project */}
                      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
                        <div className="flex items-center justify-between">
                          <h2 className="text-sm font-semibold text-slate-900">
                            Change Orders on {activeProject.name}
                          </h2>
                          <button
                            type="button"
                            onClick={() => setIsNewChangeOpen(true)}
                            className="text-xs font-medium text-blue-700 hover:underline"
                          >
                            + Log Change Order
                          </button>
                        </div>

                        {projChanges.length === 0 ? (
                          <p className="text-xs text-slate-500 py-2">
                            No change orders logged for this project yet.
                          </p>
                        ) : (
                          <div className="divide-y divide-slate-200 border border-slate-200 rounded-md">
                            {projChanges.map((co) => (
                              <div
                                key={co.id}
                                className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedChangeId(co.id);
                                        setActiveTab('change_orders');
                                      }}
                                      className="font-mono font-semibold text-blue-700 hover:underline"
                                    >
                                      {co.id}
                                    </button>
                                    <span className="font-medium text-slate-900">{co.title}</span>
                                  </div>
                                  <div className="text-slate-500">
                                    Ref: {co.linkedRequirementCode || 'Net-New'} ·{' '}
                                    {formatDate(co.createdAt)}
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                  <StatusLabel status={co.status} />
                                  <span className="font-mono tabular-nums font-medium text-slate-900">
                                    {formatSignedCurrency(co.costDelta)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* VIEW 3: AGREEMENT AUDIT HISTORY */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              {auditReturnTab && (
                <div className="flex items-center justify-between gap-4 bg-white border border-slate-200 rounded-lg px-4 py-3 no-print">
                  <span className="text-xs text-slate-600">
                    Viewing agreement audit for{' '}
                    <span className="font-semibold text-slate-900">
                      {projectFilter !== 'all' && projectsById[projectFilter]
                        ? `${projectsById[projectFilter].clientCompany} — ${projectsById[projectFilter].name}`
                        : 'selected project'}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const target = auditReturnTab;
                      setAuditReturnTab(null);
                      setActiveTab(target);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>
                      {auditReturnTab === 'projects'
                        ? 'Back to Projects & Baselines'
                        : 'Back to Change Orders'}
                    </span>
                  </button>
                </div>
              )}

              <AuditTimeline
                events={auditEvents}
                projects={projects}
                changeOrders={changeOrders}
                selectedProjectId={projectFilter}
                onSelectProject={(id) => setProjectFilter(id)}
                onInspectChangeOrder={(coId) => {
                  setAuditReturnTab(null);
                  setSelectedChangeId(coId);
                  setActiveTab('change_orders');
                }}
              />
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <NewChangeOrderModal
        isOpen={isNewChangeOpen}
        projects={projects}
        defaultProjectId={activeTab === 'projects' ? activeProject?.id : undefined}
        onClose={() => setIsNewChangeOpen(false)}
        onCreate={handleCreateChangeOrder}
      />

      <ProjectBaselineModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        onCreateProject={handleCreateProject}
      />
    </div>
  );
}
