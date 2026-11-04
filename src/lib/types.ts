export type Role = 'manager' | 'worker';

export type TaskStatus = 'new' | 'in_progress' | 'review' | 'rework' | 'accepted';

export type Profile = {
  id: string;
  full_name: string;
  role: Role;
};

export type SiteObject = {
  id: string;
  name: string;
  address: string;
  created_at: string;
  created_by: string;
  tasks?: { id: string; status: TaskStatus }[];
};

export type Task = {
  id: string;
  object_id: string;
  title: string;
  description: string | null;
  assignee_id: string;
  status: TaskStatus;
  author_id: string;
  created_at: string;
  updated_at: string;
  object?: { id: string; name: string; address: string } | null;
  assignee?: { id: string; full_name: string } | null;
  author?: { id: string; full_name: string } | null;
};

export type HistoryEntry = {
  id: number;
  task_id: string;
  from_status: TaskStatus | null;
  to_status: TaskStatus;
  comment: string | null;
  changed_by: string;
  changed_at: string;
  author?: { full_name: string } | null;
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  review: 'На проверке',
  rework: 'На доработке',
  accepted: 'Принята',
};

export const STATUS_ORDER: TaskStatus[] = ['new', 'in_progress', 'review', 'rework', 'accepted'];
