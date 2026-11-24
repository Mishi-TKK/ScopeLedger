import { CheckCircle2, Clock, FileEdit, XCircle } from 'lucide-react';
import { ChangeOrderStatus } from '../types/scope';

interface StatusLabelProps {
  status: ChangeOrderStatus;
}

const STATUS_META: Record<
  ChangeOrderStatus,
  { label: string; colorClass: string; Icon: typeof CheckCircle2 }
> = {
  approved: {
    label: 'Approved',
    colorClass: 'text-emerald-700',
    Icon: CheckCircle2,
  },
  pending_client: {
    label: 'Pending Client',
    colorClass: 'text-amber-700',
    Icon: Clock,
  },
  declined: {
    label: 'Declined',
    colorClass: 'text-red-700',
    Icon: XCircle,
  },
  draft: {
    label: 'Draft',
    colorClass: 'text-slate-600',
    Icon: FileEdit,
  },
};

export function StatusLabel({ status }: StatusLabelProps) {
  const { label, colorClass, Icon } = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${colorClass}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
