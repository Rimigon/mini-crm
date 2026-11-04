import { STATUS_LABELS, type TaskStatus } from '../lib/types';

const styles: Record<TaskStatus, string> = {
  new: 'bg-new-soft text-new',
  in_progress: 'bg-progress-soft text-progress',
  review: 'bg-review-soft text-review',
  rework: 'bg-rework-soft text-rework',
  accepted: 'bg-accepted-soft text-accepted',
};

export function StatusBadge({ status, size = 'md' }: { status: TaskStatus; size?: 'md' | 'sm' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ${styles[status]} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-[13px]'
      }`}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  );
}
