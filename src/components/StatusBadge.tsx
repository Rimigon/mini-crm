import { STATUS_LABELS, type TaskStatus } from '../lib/types';

const tone: Record<TaskStatus, string> = {
  new: 'bg-new-soft text-new',
  in_progress: 'bg-progress-soft text-progress',
  review: 'bg-review-soft text-review',
  rework: 'bg-rework-soft text-rework',
  accepted: 'bg-accepted-soft text-accepted',
};

const dot: Record<TaskStatus, string> = {
  new: 'bg-new',
  in_progress: 'bg-progress',
  review: 'bg-review',
  rework: 'bg-rework',
  accepted: 'bg-accepted',
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={`status ${tone[status]}`}>
      <span className={`size-1.5 rounded-full ${dot[status]}`} aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function StatusDot({ status }: { status: TaskStatus }) {
  return <span className={`size-1.5 shrink-0 rounded-full ${dot[status]}`} aria-hidden />;
}
