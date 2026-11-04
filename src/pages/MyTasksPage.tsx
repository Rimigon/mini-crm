import { Link } from 'react-router-dom';
import { useProfile } from '../auth/useAuth';
import { fetchTasks } from '../lib/api';
import { useAsync } from '../hooks/useAsync';
import { EmptyState, ErrorNote, Spinner } from '../components/States';
import { StatusDot } from '../components/StatusBadge';
import { formatDate } from '../lib/format';
import { STATUS_LABELS, STATUS_ORDER, type Task } from '../lib/types';

export function MyTasksPage() {
  const profile = useProfile();
  const { data, error, loading, reload } = useAsync(() => fetchTasks({ mine: profile.id }), [profile.id]);

  const tasks = data ?? [];
  const active = tasks.filter((task) => task.status !== 'accepted');

  return (
    <div>
      <header>
        <p className="micro">
          {tasks.length > 0
            ? `активных ${active.length}, принято ${tasks.length - active.length}`
            : 'личный список'}
        </p>
        <h1 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.025em] sm:text-[34px]">
          Мои задачи
        </h1>
        <p className="mt-4 max-w-[560px] text-[15px] leading-relaxed text-ink-500">
          Только ваши задачи по всем объектам. Берите в работу, отправляйте на проверку и следите за
          замечаниями.
        </p>
      </header>

      {tasks.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-px border-y border-line bg-line sm:grid-cols-5">
          {STATUS_ORDER.map((status) => {
            const count = tasks.filter((item) => item.status === status).length;
            return (
              <div key={status} className="bg-paper px-4 py-4 first:pl-0">
                <p
                  className={`num text-[20px] font-semibold leading-none ${count > 0 ? 'text-ink-900' : 'text-ink-400'}`}
                >
                  {count}
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-500">
                  <StatusDot status={status} />
                  {STATUS_LABELS[status]}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {loading && <Spinner label="читаем задачи" />}
      {error && <ErrorNote message={error} onRetry={reload} />}

      {!loading && !error && tasks.length === 0 && (
        <div className="mt-10">
          <EmptyState
            title="Задач пока нет"
            hint="Постановщик назначит задачи на объектах, они появятся в этом списке."
          />
        </div>
      )}

      <div className="mt-10 space-y-8">
        {STATUS_ORDER.map((status) => {
          const group = tasks.filter((task) => task.status === status);
          if (group.length === 0) return null;
          return (
            <section key={status}>
              <div className="mb-2.5 flex items-center gap-2">
                <StatusDot status={status} />
                <span className="text-[12px] font-medium text-ink-500">{STATUS_LABELS[status]}</span>
                <span className="num text-[12px] text-ink-400">{group.length}</span>
              </div>
              <div className="card overflow-hidden">
                {group.map((task) => (
                  <MyTaskRow key={task.id} task={task} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function MyTaskRow({ task }: { task: Task }) {
  return (
    <Link
      to={`/tasks/${task.id}`}
      className="row-link flex items-center gap-4 border-b border-line px-5 py-4 outline-offset-[-2px] last:border-b-0"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium">{task.title}</p>
        <p className="mt-0.5 truncate text-[12px] text-ink-500">
          {task.object?.name ?? 'объект удалён'}
          <span className="px-1.5 text-line-strong">·</span>
          <span className="num">{formatDate(task.created_at)}</span>
        </p>
      </div>
    </Link>
  );
}




