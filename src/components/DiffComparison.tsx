import { ArrowRight, Calendar, DollarSign, FileDiff } from 'lucide-react';
import { ChangeOrder, Project } from '../types/scope';
import {
  addBusinessDays,
  formatCurrency,
  formatDate,
  formatSignedCurrency,
} from '../utils/format';

interface DiffComparisonProps {
  changeOrder: ChangeOrder;
  project: Project;
  currentApprovedBudget: number;
  currentTargetDate: string;
}

export function DiffComparison({
  changeOrder,
  project,
  currentApprovedBudget,
  currentTargetDate,
}: DiffComparisonProps) {
  const isAlreadyApplied = changeOrder.status === 'approved';
  const projectedBudget = isAlreadyApplied
    ? currentApprovedBudget
    : currentApprovedBudget + changeOrder.costDelta;

  const projectedDate = isAlreadyApplied
    ? currentTargetDate
    : addBusinessDays(currentTargetDate, changeOrder.timelineDeltaDays);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-2.5">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
          <FileDiff className="w-4 h-4 text-slate-500" aria-hidden="true" />
          <span>Scope Comparison: Original Baseline vs. Requested Change</span>
        </div>
        <span className="text-xs text-slate-500 font-mono">
          {changeOrder.changeType === 'modify_requirement' && changeOrder.linkedRequirementCode
            ? `Modifies ${changeOrder.linkedRequirementCode} (${project.baselineVersion})`
            : `Net-New Addition (${project.baselineVersion})`}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Original Baseline */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Original Agreed Requirement</span>
              <span className="font-mono">Baseline {project.baselineVersion}</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {changeOrder.originalRequirementSnapshot}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-200/80 text-xs text-slate-500 flex items-center justify-between">
            <span>Signed {formatDate(project.baselineSignedAt)}</span>
            <span className="font-mono tabular-nums">{formatCurrency(project.originalBudget)} base</span>
          </div>
        </div>

        {/* Proposed Change */}
        <div className="rounded-lg border border-blue-200 bg-blue-50/35 p-4 flex flex-col justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs text-blue-800">
              <span className="font-semibold">Proposed Change / Addition</span>
              <span className="font-mono">{changeOrder.id}</span>
            </div>
            <p className="text-sm text-slate-900 leading-relaxed font-medium">
              {changeOrder.proposedChange}
            </p>
            {changeOrder.technicalImpact && (
              <p className="text-xs text-slate-600 leading-relaxed pt-1">
                <span className="font-medium text-slate-700">Technical Scope: </span>
                {changeOrder.technicalImpact}
              </p>
            )}
          </div>
          <div className="pt-2 border-t border-blue-200/70 text-xs text-blue-900 flex items-center justify-between font-mono tabular-nums">
            <span>{formatSignedCurrency(changeOrder.costDelta)}</span>
            <span>+{changeOrder.timelineDeltaDays} business days</span>
          </div>
        </div>
      </div>

      {/* Impact Rollup Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-3.5 text-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-slate-500">
            <DollarSign className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span>{isAlreadyApplied ? 'Contract Value Impact' : 'If Approved Contract Value'}</span>
          </span>
          <span className="flex items-center gap-1.5 font-mono tabular-nums text-slate-900 font-medium">
            <span className="text-slate-500">
              {formatCurrency(
                isAlreadyApplied
                  ? currentApprovedBudget - changeOrder.costDelta
                  : currentApprovedBudget
              )}
            </span>
            <ArrowRight className="w-3 h-3 text-slate-400" aria-hidden="true" />
            <span>{formatCurrency(projectedBudget)}</span>
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 sm:border-l sm:border-slate-200 sm:pl-4">
          <span className="flex items-center gap-1.5 text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span>{isAlreadyApplied ? 'Delivery Target Impact' : 'Projected Delivery Date'}</span>
          </span>
          <span className="flex items-center gap-1.5 font-mono tabular-nums text-slate-900 font-medium">
            <span className="text-slate-500">
              {formatDate(
                isAlreadyApplied
                  ? addBusinessDays(currentTargetDate, -changeOrder.timelineDeltaDays)
                  : currentTargetDate
              )}
            </span>
            <ArrowRight className="w-3 h-3 text-slate-400" aria-hidden="true" />
            <span>{formatDate(projectedDate)}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
