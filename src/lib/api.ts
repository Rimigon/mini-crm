import { supabase } from './supabase';
import type { HistoryEntry, Profile, SiteObject, Task, TaskStatus } from './types';

// Сообщения базы уже написаны на русском языке и checked в триггерах,
// поэтому показываем их как есть, а технические тексты переводим на человеческий.
function humanError(error: { message: string; code?: string } | null): never {
  const message = error?.message ?? 'Неизвестная ошибка';

  if (message.includes('row-level security')) {
    throw new Error('Действие запрещено правами доступа');
  }
  if (message.includes('permission denied')) {
    throw new Error('Недостаточно прав для этого действия');
  }
  if (message.includes('duplicate key')) {
    throw new Error('Такая запись уже существует');
  }
  throw new Error(message);
}

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) humanError(error ?? { message: 'Профиль сотрудника не найден' });
  return data;
}

export async function fetchWorkers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('role', 'worker')
    .order('full_name');

  if (error) humanError(error);
  return data ?? [];
}

export async function fetchObjects(): Promise<SiteObject[]> {
  const { data, error } = await supabase
    .from('objects')
    .select('id, name, address, created_at, created_by, tasks(id, status)')
    .order('name');

  if (error) humanError(error);
  return (data ?? []) as SiteObject[];
}

export async function fetchObject(id: string): Promise<SiteObject> {
  const { data, error } = await supabase
    .from('objects')
    .select('id, name, address, created_at, created_by')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) humanError(error ?? { message: 'Объект не найден или недоступен' });
  return data as SiteObject;
}

export async function createObject(values: { name: string; address: string }): Promise<void> {
  const { error } = await supabase.from('objects').insert(values);
  if (error) humanError(error);
}

export async function updateObject(id: string, values: { name: string; address: string }): Promise<void> {
  const { error } = await supabase.from('objects').update(values).eq('id', id);
  if (error) humanError(error);
}

export async function deleteObject(id: string): Promise<void> {
  const { error } = await supabase.from('objects').delete().eq('id', id);
  if (error) humanError(error);
}

const taskSelect = `
  id, object_id, title, description, assignee_id, status, author_id, created_at, updated_at,
  object:objects(id, name, address),
  assignee:profiles!tasks_assignee_id_fkey(id, full_name),
  author:profiles!tasks_author_id_fkey(id, full_name)
`;

export async function fetchTasks(options: { mine?: string; objectId?: string } = {}): Promise<Task[]> {
  let request = supabase.from('tasks').select(taskSelect).order('created_at', { ascending: false });
  if (options.mine) request = request.eq('assignee_id', options.mine);
  if (options.objectId) request = request.eq('object_id', options.objectId);

  const { data, error } = await request;
  if (error) humanError(error);
  return (data ?? []) as unknown as Task[];
}

export async function fetchTask(id: string): Promise<Task> {
  const { data, error } = await supabase.from('tasks').select(taskSelect).eq('id', id).maybeSingle();
  if (error || !data) humanError(error ?? { message: 'Задача не найдена или недоступна' });
  return data as unknown as Task;
}

export async function fetchHistory(taskId: string): Promise<HistoryEntry[]> {
  const { data, error } = await supabase
    .from('task_history')
    .select('id, task_id, from_status, to_status, comment, changed_by, changed_at, author:profiles!task_history_changed_by_fkey(full_name)')
    .eq('task_id', taskId)
    .order('changed_at', { ascending: true });

  if (error) humanError(error);
  return (data ?? []) as unknown as HistoryEntry[];
}

export async function createTask(values: {
  object_id: string;
  title: string;
  description: string | null;
  assignee_id: string;
}): Promise<string> {
  const { data, error } = await supabase.from('tasks').insert(values).select('id').maybeSingle();
  if (error || !data) humanError(error ?? { message: 'Задача не создана' });
  return (data as { id: string }).id;
}

export async function updateTask(
  id: string,
  values: { title?: string; description?: string | null; assignee_id?: string },
): Promise<void> {
  const { error } = await supabase.from('tasks').update(values).eq('id', id);
  if (error) humanError(error);
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) humanError(error);
}

// Единственный путь смены статуса: проверка роли, назначения и перехода живёт в базе.
export async function changeTaskStatus(
  taskId: string,
  status: TaskStatus,
  comment?: string,
): Promise<void> {
  const { error } = await supabase.rpc('change_task_status', {
    p_task_id: taskId,
    p_new_status: status,
    p_comment: comment?.trim() ? comment.trim() : null,
  });
  if (error) humanError(error);
}

