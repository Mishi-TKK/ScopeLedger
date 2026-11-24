import { X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ChangeScopeType, Project, RequestChannel } from '../types/scope';

interface NewChangeOrderModalProps {
  isOpen: boolean;
  projects: Project[];
  defaultProjectId?: string;
  onClose: () => void;
  onCreate: (payload: {
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
  }) => void;
}

export function NewChangeOrderModal({
  isOpen,
  projects,
  defaultProjectId,
  onClose,
  onCreate,
}: NewChangeOrderModalProps) {
  const [projectId, setProjectId] = useState(defaultProjectId || projects[0]?.id || '');
  const [changeType, setChangeType] = useState<ChangeScopeType>('modify_requirement');
  const [linkedRequirementId, setLinkedRequirementId] = useState('');
  const [originalSnapshot, setOriginalSnapshot] = useState('');
  const [title, setTitle] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [requestedChannel, setRequestedChannel] = useState<RequestChannel>('Slack');
  const [proposedChange, setProposedChange] = useState('');
  const [technicalImpact, setTechnicalImpact] = useState('');
  const [costDelta, setCostDelta] = useState('1500');
  const [timelineDeltaDays, setTimelineDeltaDays] = useState('3');
  const [sendImmediately, setSendImmediately] = useState(true);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId) || projects[0],
    [projects, projectId]
  );

  useEffect(() => {
    if (!isOpen) return;
    const initialProj = projects.find((p) => p.id === (defaultProjectId || projectId)) || projects[0];
    if (initialProj) {
      setProjectId(initialProj.id);
      setRequestedBy(initialProj.clientContactName);
      const firstReq = initialProj.requirements[0];
      if (firstReq) {
        setLinkedRequirementId(firstReq.id);
        setOriginalSnapshot(`${firstReq.code}: ${firstReq.description}`);
      }
    }
  }, [isOpen, defaultProjectId, projects]);

  useEffect(() => {
    if (!selectedProject) return;
    if (changeType === 'net_new_scope') {
      setOriginalSnapshot(
        `Not included in Baseline ${selectedProject.baselineVersion} — Net-new addition outside original agreement.`
      );
    } else {
      const req =
        selectedProject.requirements.find((r) => r.id === linkedRequirementId) ||
        selectedProject.requirements[0];
      if (req) {
        setLinkedRequirementId(req.id);
        setOriginalSnapshot(`${req.code}: ${req.description}`);
      } else {
        setChangeType('net_new_scope');
      }
    }
  }, [selectedProject, changeType, linkedRequirementId]);

  if (!isOpen || !selectedProject) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !proposedChange.trim()) return;
    const linkedReq =
      changeType === 'modify_requirement'
        ? selectedProject.requirements.find((r) => r.id === linkedRequirementId)
        : undefined;

    onCreate({
      projectId: selectedProject.id,
      title: title.trim(),
      requestedBy: requestedBy.trim() || selectedProject.clientContactName,
      requestedChannel,
      changeType,
      linkedRequirementId: linkedReq?.id,
      linkedRequirementCode: linkedReq?.code,
      originalRequirementSnapshot: originalSnapshot.trim(),
      proposedChange: proposedChange.trim(),
      technicalImpact: technicalImpact.trim(),
      costDelta: Math.max(0, Number(costDelta) || 0),
      timelineDeltaDays: Math.max(0, Number(timelineDeltaDays) || 0),
      sendImmediately,
    });

    setTitle('');
    setProposedChange('');
    setTechnicalImpact('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-co-title"
    >
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4 sticky top-0 bg-white z-10">
          <div>
            <h2 id="new-co-title" className="text-base font-semibold text-slate-900">
              Create Change Order
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Compare against original baseline requirements and log cost or timeline impact.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Project</span>
              <select
                value={projectId}
                onChange={(e) => {
                  const next = projects.find((p) => p.id === e.target.value);
                  setProjectId(e.target.value);
                  if (next) {
                    setRequestedBy(next.clientContactName);
                    if (next.requirements[0]) setLinkedRequirementId(next.requirements[0].id);
                  }
                }}
                className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.clientCompany} — {p.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Change Title</span>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Add SSO Role Mapping Sync"
                className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Requested By</span>
              <input
                type="text"
                value={requestedBy}
                onChange={(e) => setRequestedBy(e.target.value)}
                placeholder="Client stakeholder name"
                className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Where Was It Requested?</span>
              <select
                value={requestedChannel}
                onChange={(e) => setRequestedChannel(e.target.value as RequestChannel)}
                className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                <option value="Slack">Slack</option>
                <option value="Email">Email</option>
                <option value="Sprint Review">Sprint Review</option>
                <option value="Phone Call">Phone Call</option>
                <option value="Client Portal">Client Portal</option>
              </select>
            </label>
          </div>

          {/* Original Scope Link */}
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-800">
                Comparison Against Original Scope ({selectedProject.baselineVersion})
              </span>
              <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 rounded-md">
                <button
                  type="button"
                  onClick={() => setChangeType('modify_requirement')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                    changeType === 'modify_requirement'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Modifies Requirement
                </button>
                <button
                  type="button"
                  onClick={() => setChangeType('net_new_scope')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                    changeType === 'net_new_scope'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Net-New Addition
                </button>
              </div>
            </div>

            {changeType === 'modify_requirement' && selectedProject.requirements.length > 0 && (
              <label className="block space-y-1">
                <span className="text-xs text-slate-600">Select Original Requirement</span>
                <select
                  value={linkedRequirementId}
                  onChange={(e) => setLinkedRequirementId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                >
                  {selectedProject.requirements.map((req) => (
                    <option key={req.id} value={req.id}>
                      {req.code}: {req.title}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block space-y-1">
              <span className="text-xs text-slate-600">
                Original Agreed Specification (Captured in Audit Trail)
              </span>
              <textarea
                rows={2}
                value={originalSnapshot}
                onChange={(e) => setOriginalSnapshot(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-700">Proposed Change / New Deliverable</span>
            <textarea
              required
              rows={3}
              value={proposedChange}
              onChange={(e) => setProposedChange(e.target.value)}
              placeholder="Describe clearly what is being added or changed compared to the original requirement..."
              className="w-full rounded-md border border-slate-200 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-700">
              Technical & QA Impact (Optional)
            </span>
            <input
              type="text"
              value={technicalImpact}
              onChange={(e) => setTechnicalImpact(e.target.value)}
              placeholder="e.g., DB migration, third-party webhook retries, regression QA"
              className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Cost Impact (USD)</span>
              <input
                type="number"
                min="0"
                step="50"
                required
                value={costDelta}
                onChange={(e) => setCostDelta(e.target.value)}
                className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Schedule Impact (Business Days)</span>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={timelineDeltaDays}
                onChange={(e) => setTimelineDeltaDays(e.target.value)}
                className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </label>
          </div>

          <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={sendImmediately}
              onChange={(e) => setSendImmediately(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
            />
            <span>Mark as &ldquo;Pending Client&rdquo; immediately and generate client approval link</span>
          </label>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-md bg-slate-900 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
            >
              {sendImmediately ? 'Create & Ready Approval Link' : 'Save as Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
