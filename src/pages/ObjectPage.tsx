import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useProfile } from '../auth/AuthContext';
import {
  createTask,
  deleteObject,
  deleteTask,
  fetchObject,
  fetchTasks,
  fetchWorkers,
} from '../lib/api';
import { useAsync } from '../hooks/useAsync';
import { EmptyState, ErrorNote, LoadError, Spinner } from '../components/States';
import { StatusBadge } from '../components/StatusBadge';
import { ObjectFormModal } from '../components/ObjectFormModal';
import { TaskFormModal } from '../components/TaskFormModal';
import { updateObject } from '../lib/api';
import { formatDate, pluralize } from '../lib/format';
import { STATUS_LABELS, STATUS_ORDER, type Task } from '../lib/types';

export function ObjectPage() {
  const { id = '' } = useParams();
  const profile = useProfile();
  const isManager = profile.role === 'manager';
  const navigate = useNavigate();

  const object = useAsync(() => fetchObject(id), [id]);
  const tasks = useAsync(() => fetchTasks({ objectId: id }), [id]);
  const workers = useAsync(() => (isManager ? fetchWorkers() : Promise.resolve([])), [isManager]);

  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function guard(action: () => Promise<void>) {
    return async () => {
      setActionError(null);
      try {
        await action();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Действие не выполнено');
      }
    };
  }

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    items: (tasks.data ?? []).filter((task) => task.status === status),
  })).filter((group) => group.items.length > 0);

  async function removeObject() {
    if (!object.data) return;
    if (!confirm(`Удалить объект «${object.data.name}» вместе с задачами?`)) return;
    await guard(async () => {
      await deleteObject(object.data!.id);
      navigate('/');
    })();
  }

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-ink-500 transition-colors hover:text-ink-900">
        ← Все объекты
      </Link>

      {actionError && <ErrorNote message={actionError} />}
      {object.loading && <Spinner />}
      {object.error && <LoadError message={object.error} onRetry={object.reload} />}

      {object.data && (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{object.data.name}</h1>
            <p className="mt-1 text-sm text-ink-500">{object.data.address}</p>
            <p className="mt-1.5 text-[13px] text-ink-400">
              Добавлен {formatDate(object.data.created_at)}
            </p>
          </div>
          {isManager && (
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setEditOpen(true)}>
                Изменить
              </button>
              <button type="button" className="btn btn-danger" onClick={() => void removeObject()}>
                Удалить
              </button>
            </div>
          )}
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">
            Задачи
            {tasks.data && tasks.data.length > 0 && (
              <span className="ml-2 font-normal text-ink-400 tabular-nums">
                {tasks.data.length} {pluralize(tasks.data.length, 'задача', 'задачи', 'задач')}
              </span>
            )}
          </h2>
          {isManager && (
            <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
              Добавить задачу
            </button>
          )}
        </div>

        {tasks.loading && <Spinner />}
        {tasks.error && <ErrorNote message={tasks.error} onRetry={tasks.reload} />}

        {tasks.data && tasks.data.length === 0 && (
          <EmptyState
            title="Задач по объекту пока нет"
            hint={isManager ? 'Поставьте первую задачу и назначьте исполнителя.' : 'Вам сюда ещё ничего не назначали.'}
          />
        )}

        {grouped.map((group) => (
          <div key={group.status} className="space-y-2">
            <h3 className="pt-2 text-[13px] font-medium uppercase tracking-wide text-ink-400">
              {STATUS_LABELS[group.status]} · {group.items.length}
            </h3>
            <div className="card divide-y divide-line overflow-hidden">
              {group.items.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  canDelete={isManager}
                  onDelete={guard(async () => {
                    await deleteTask(task.id);
                    await tasks.reload();
                  })}
                />
              ))}
            </div>
          </div>
        ))}
      </section>

      <ObjectFormModal
        open={editOpen}
        initial={object.data}
        onClose={() => setEditOpen(false)}
        onSubmit={async (values) => {
          await updateObject(id, values);
          await object.reload();
        }}
      />

      <TaskFormModal
        open={createOpen}
        workers={workers.data ?? []}
        onClose={() => setCreateOpen(false)}
        onSubmit={async (values) => {
          await createTask({ ...values, object_id: id });
          await tasks.reload();
        }}
      />
    </div>
  );
}

function TaskRow({
  task,
  canDelete,
  onDelete,
}: {
  task: Task;
  canDelete: boolean;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-paper/70">
      <Link to={`/tasks/${task.id}`} className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{task.title}</p>
        <p className="mt-0.5 text-[13px] text-ink-500">
          {task.assignee?.full_name ?? 'Исполнитель не указан'} · создана {formatDate(task.created_at)}
        </p>
      </Link>
      <StatusBadge status={task.status} size="sm" />
      {canDelete && (
        <button
          type="button"
          className="btn btn-danger px-2 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          onClick={onDelete}
        >
          Удалить
        </button>
      )}
    </div>
  );
}

