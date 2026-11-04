import { Link } from 'react-router-dom';
import { useProfile } from '../auth/AuthContext';
import { fetchTasks } from '../lib/api';
import { useAsync } from '../hooks/useAsync';
import { EmptyState, ErrorNote, Spinner } from '../components/States';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate } from '../lib/format';
import { STATUS_LABELS, STATUS_ORDER, type Task } from '../lib/types';

export function MyTasksPage() {
  const profile = useProfile();
  const { data, error, loading, reload } = useAsync(() => fetchTasks({ mine: profile.id }), [profile.id]);

  const tasks = data ?? [];
  const active = tasks.filter((task) => task.status !== 'accepted');
  const done = tasks.filter((task) => task.status === 'accepted');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Мои задачи</h1>
        <p className="mt-1 text-sm text-ink-500">
          {active.length > 0
            ? `Активных задач ${active.length}, принято ${done.length}`
            : 'Активных задач нет, всё принято'}
        </p>
      </div>

      {loading && <Spinner />}
      {error && <ErrorNote message={error} onRetry={reload} />}

      {!loading && !error && tasks.length === 0 && (
        <EmptyState
          title="Задач пока нет"
          hint="Постановщик назначит задачи на объектах, они появятся здесь."
        />
      )}

      {STATUS_ORDER.map((status) => {
        const group = tasks.filter((task) => task.status === status);
        if (group.length === 0) return null;
        return (
          <section key={status} className="space-y-2">
            <h2 className="text-[13px] font-medium uppercase tracking-wide text-ink-400">
              {STATUS_LABELS[status]} · {group.length}
            </h2>
            <div className="card divide-y divide-line overflow-hidden">
              {group.map((task) => (
                <MyTaskRow key={task.id} task={task} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function MyTaskRow({ task }: { task: Task }) {
  return (
    <Link
      to={`/tasks/${task.id}`}
      className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-paper/70"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{task.title}</p>
        <p className="mt-0.5 truncate text-[13px] text-ink-500">
          {task.object?.name ?? 'Объект удалён'} · создана {formatDate(task.created_at)}
        </p>
      </div>
      <StatusBadge status={task.status} size="sm" />
    </Link>
  );
}
