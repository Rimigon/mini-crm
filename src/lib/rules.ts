import type { Role, TaskStatus } from './types';

export type TaskAction = 'take' | 'submit' | 'accept' | 'rework';

const workerActions: Record<TaskStatus, TaskAction[]> = {
  new: ['take'],
  rework: ['take'],
  in_progress: ['submit'],
  review: [],
  accepted: [],
};

const managerActions: Record<TaskStatus, TaskAction[]> = {
  new: [],
  in_progress: [],
  review: ['accept', 'rework'],
  rework: [],
  accepted: [],
};

// Те же правила, что проверяет change_task_status в базе. Здесь они нужны,
// чтобы не показывать кнопки, которые всё равно отклонит сервер.
export function availableTaskActions(
  status: TaskStatus,
  role: Role,
  isAssignee: boolean,
): TaskAction[] {
  if (role === 'manager') return managerActions[status];
  return isAssignee ? workerActions[status] : [];
}

export function canEditTask(role: Role): boolean {
  return role === 'manager';
}

export function canReview(status: TaskStatus, role: Role): boolean {
  return role === 'manager' && managerActions[status].includes('accept');
}

