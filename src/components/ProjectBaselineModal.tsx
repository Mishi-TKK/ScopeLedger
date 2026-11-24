import { Plus, Trash2, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { BaselineRequirement } from '../types/scope';

interface ProjectBaselineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (payload: {
    name: string;
    clientCompany: string;
    clientContactName: string;
    clientContactRole: string;
    clientContactEmail: string;
    providerName: string;
    originalBudget: number;
    originalTargetDate: string;
    requirements: Omit<BaselineRequirement, 'id' | 'agreedVersion'>[];
  }) => void;
}

export function ProjectBaselineModal({
  isOpen,
  onClose,
  onCreateProject,
}: ProjectBaselineModalProps) {
  const [name, setName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientContactName, setClientContactName] = useState('');
  const [clientContactRole, setClientContactRole] = useState('VP of Engineering');
  const [clientContactEmail, setClientContactEmail] = useState('');
  const [providerName, setProviderName] = useState('Northbridge Software Studio');
  const [originalBudget, setOriginalBudget] = useState('15000');
  const [originalTargetDate, setOriginalTargetDate] = useState('2026-12-30');
  const [requirements, setRequirements] = useState<
    Omit<BaselineRequirement, 'id' | 'agreedVersion'>[]
  >([
    {
      code: 'REQ-01',
      title: 'Core User Authentication',
      description: 'Standard email and password login with forgot-password recovery.',
      category: 'Security',
    },
    {
      code: 'REQ-02',
      title: 'Primary Admin Dashboard',
      description: 'Single-tenant overview table with CSV export.',
      category: 'Feature',
    },
  ]);

  if (!isOpen) return null;

  const handleAddReq = () => {
    const nextNum = String(requirements.length + 1).padStart(2, '0');
    setRequirements((prev) => [
      ...prev,
      {
        code: `REQ-${nextNum}`,
        title: '',
        description: '',
        category: 'Feature',
      },
    ]);
  };

  const handleUpdateReq = (
    idx: number,
    patch: Partial<Omit<BaselineRequirement, 'id' | 'agreedVersion'>>
  ) => {
    setRequirements((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const handleRemoveReq = (idx: number) => {
    setRequirements((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !clientCompany.trim()) return;
    const validReqs = requirements.filter((r) => r.title.trim() && r.description.trim());
    onCreateProject({
      name: name.trim(),
      clientCompany: clientCompany.trim(),
      clientContactName: clientContactName.trim() || 'Client Stakeholder',
      clientContactRole: clientContactRole.trim() || 'Project Sponsor',
      clientContactEmail: clientContactEmail.trim() || 'client@company.com',
      providerName: providerName.trim() || 'Northbridge Software Studio',
      originalBudget: Math.max(0, Number(originalBudget) || 0),
      originalTargetDate,
      requirements: validReqs,
    });
    setName('');
    setClientCompany('');
    setClientContactName('');
    setClientContactEmail('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-proj-title"
    >
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4 sticky top-0 bg-white z-10">
          <div>
            <h2 id="new-proj-title" className="text-base font-semibold text-slate-900">
              Lock New Project & Baseline Requirements
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Establishes Baseline v1.0 in the agreement audit trail for future comparisons.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Project Name</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., B2B Partner API Portal"
                className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Client Company</span>
              <input
                type="text"
                required
                value={clientCompany}
                onChange={(e) => setClientCompany(e.target.value)}
                placeholder="e.g., Horizon Freight Inc."
                className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Client Contact</span>
              <input
                type="text"
                value={clientContactName}
                onChange={(e) => setClientContactName(e.target.value)}
                placeholder="Jordan Ellis"
                className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Contact Role</span>
              <input
                type="text"
                value={clientContactRole}
                onChange={(e) => setClientContactRole(e.target.value)}
                className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Contact Email</span>
              <input
                type="email"
                value={clientContactEmail}
                onChange={(e) => setClientContactEmail(e.target.value)}
                placeholder="jordan@horizon.io"
                className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Your Studio / Team Name</span>
              <input
                type="text"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Original Agreed Budget ($)</span>
              <input
                type="number"
                min="0"
                step="100"
                required
                value={originalBudget}
                onChange={(e) => setOriginalBudget(e.target.value)}
                className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Original Target Date</span>
              <input
                type="date"
                required
                value={originalTargetDate}
                onChange={(e) => setOriginalTargetDate(e.target.value)}
                className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </label>
          </div>

          {/* Original Requirements Builder */}
          <div className="space-y-3 border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800">
                Original Agreed Requirements (Baseline v1.0)
              </span>
              <button
                type="button"
                onClick={handleAddReq}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Add Requirement</span>
              </button>
            </div>

            <div className="space-y-3">
              {requirements.map((req, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2.5"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={req.code}
                      onChange={(e) => handleUpdateReq(idx, { code: e.target.value })}
                      className="w-24 h-8 rounded border border-slate-200 bg-white px-2 text-xs font-mono text-slate-900"
                      aria-label="Requirement code"
                    />
                    <input
                      type="text"
                      value={req.title}
                      onChange={(e) => handleUpdateReq(idx, { title: e.target.value })}
                      placeholder="Requirement title"
                      className="flex-1 h-8 rounded border border-slate-200 bg-white px-2.5 text-xs text-slate-900"
                      aria-label="Requirement title"
                    />
                    <select
                      value={req.category}
                      onChange={(e) =>
                        handleUpdateReq(idx, {
                          category: e.target.value as BaselineRequirement['category'],
                        })
                      }
                      className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700"
                      aria-label="Requirement category"
                    >
                      <option value="Feature">Feature</option>
                      <option value="Integration">Integration</option>
                      <option value="Security">Security</option>
                      <option value="Data">Data</option>
                      <option value="Design">Design</option>
                    </select>
                    {requirements.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveReq(idx)}
                        aria-label="Remove requirement"
                        className="p-1.5 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={2}
                    value={req.description}
                    onChange={(e) => handleUpdateReq(idx, { description: e.target.value })}
                    placeholder="Specific boundaries of what is included in the original contract..."
                    className="w-full rounded border border-slate-200 bg-white p-2 text-xs text-slate-700"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-md bg-slate-900 text-sm font-medium text-white hover:bg-slate-800"
            >
              Lock Baseline v1.0
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
