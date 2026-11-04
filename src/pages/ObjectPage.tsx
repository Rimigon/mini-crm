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
  updateObject,
} from '../lib/api';
import { useAsync } from '../hooks/useAsync';
import { EmptyState, ErrorNote, LoadError, Spinner } from '../components/States';
import { StatusDot } from '../components/StatusBadge';
import { ObjectFormModal } from '../components/ObjectFormModal';
import { TaskFormModal } from '../components/TaskFormModal';
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
    <div>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-500 transition-colors duration-150 hover:text-ink-900"
      >
        ← Все объекты
      </Link>

      {actionError && (
        <div className="mt-6">
          <ErrorNote message={actionError} />
        </div>
      )}
      {object.loading && <Spinner label="читаем объект" />}
      {object.error && <LoadError message={object.error} onRetry={object.reload} />}

      {object.data && (
        <header className="mt-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <p className="micro">объект</p>
              <h1 className="mt-3 max-w-[720px] text-[26px] font-semibold leading-tight tracking-[-0.025em] sm:text-[30px]">
                {object.data.name}
              </h1>
              <p className="mt-3 text-[15px] text-ink-700">{object.data.address}</p>
              <p className="mt-1 text-[12px] text-ink-400">
                в системе с {formatDate(object.data.created_at)}
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
        </header>
      )}

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <h2 className="text-[19px] font-semibold tracking-[-0.02em]">Задачи</h2>
            {tasks.data && (
              <span className="text-[12px] text-ink-400">
                {tasks.data.length} {pluralize(tasks.data.length, 'задача', 'задачи', 'задач')}
              </span>
            )}
          </div>
          {isManager && (
            <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
              Добавить задачу
            </button>
          )}
        </div>

        {tasks.loading && <Spinner label="читаем задачи" />}
        {tasks.error && <ErrorNote message={tasks.error} onRetry={tasks.reload} />}

        {tasks.data && tasks.data.length === 0 && (
          <div className="mt-6">
            <EmptyState
              title="Задач по объекту нет"
              hint={
                isManager
                  ? 'Поставьте первую задачу и назначьте исполнителя.'
                  : 'Вам сюда ещё ничего не назначали.'
              }
            />
          </div>
        )}

        <div className="mt-7 card overflow-hidden">
          {grouped.map((group) => (
            <div key={group.status}>
              <div className="flex items-center gap-2 border-b border-line bg-paper/70 px-5 py-2">
                <StatusDot status={group.status} />
                <span className="text-[12px] font-medium text-ink-500">{STATUS_LABELS[group.status]}</span>
                <span className="num text-[11px] text-ink-400">{group.items.length}</span>
              </div>
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
          ))}
        </div>
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

function TaskRow({ task, canDelete, onDelete }: { task: Task; canDelete: boolean; onDelete: () => void }) {
  return (
    <div className="group flex items-center gap-4 border-b border-line px-5 py-4 last:border-b-0">
      <Link to={`/tasks/${task.id}`} className="min-w-0 flex-1 outline-offset-4">
        <p className="truncate text-[15px] font-medium transition-colors duration-150 group-hover:text-accent">
          {task.title}
        </p>
        <p className="mt-0.5 truncate text-[12px] text-ink-500">
          {task.assignee?.full_name ?? 'исполнитель не назначен'}
          <span className="px-1.5 text-line-strong">·</span>
          <span className="num">{formatDate(task.created_at)}</span>
        </p>
      </Link>
      {canDelete && (
        <button
          type="button"
          className="btn btn-ghost px-2 py-1 text-[12px] text-ink-400 opacity-100 transition-opacity duration-150 hover:text-rework focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          onClick={onDelete}
        >
          Удалить
        </button>
      )}
    </div>
  );
}


