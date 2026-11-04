import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useProfile } from '../auth/AuthContext';
import {
  changeTaskStatus,
  deleteTask,
  fetchHistory,
  fetchTask,
  fetchWorkers,
  updateTask,
} from '../lib/api';
import { useAsync } from '../hooks/useAsync';
import { ErrorNote, LoadError, Spinner } from '../components/States';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { formatDateTime } from '../lib/format';
import { STATUS_LABELS, type Task, type TaskStatus } from '../lib/types';

export function TaskPage() {
  const { id = '' } = useParams();
  const profile = useProfile();
  const isManager = profile.role === 'manager';
  const navigate = useNavigate();

  const task = useAsync(() => fetchTask(id), [id]);
  const history = useAsync(() => fetchHistory(id), [id]);
  const workers = useAsync(() => (isManager ? fetchWorkers() : Promise.resolve([])), [isManager]);

  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reworkOpen, setReworkOpen] = useState(false);
  const [reworkComment, setReworkComment] = useState('');
  const [editOpen, setEditOpen] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      await Promise.all([task.reload(), history.reload()]);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Действие не выполнено');
    } finally {
      setBusy(false);
    }
  }

  const current = task.data;
  const canTakeWork =
    !isManager && current && (current.status === 'new' || current.status === 'rework');
  const canSendToReview = !isManager && current?.status === 'in_progress';
  const canReview = isManager && current?.status === 'review';

  return (
    <div className="space-y-6">
      <button
        type="button"
        className="inline-flex items-center gap-1 text-sm text-ink-500 transition-colors hover:text-ink-900"
        onClick={() => navigate(-1)}
      >
        ← Назад
      </button>

      {actionError && <ErrorNote message={actionError} />}
      {task.loading && <Spinner />}
      {task.error && <LoadError message={task.error} onRetry={task.reload} />}

      {current && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <StatusBadge status={current.status} />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">{current.title}</h1>
              {current.object && (
                <Link
                  to={`/objects/${current.object.id}`}
                  className="mt-1.5 inline-flex items-center gap-1 text-sm text-ink-500 transition-colors hover:text-accent"
                >
                  {current.object.name} · {current.object.address}
                </Link>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {canTakeWork && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => void run(() => changeTaskStatus(current.id, 'in_progress'))}
                >
                  Взять в работу
                </button>
              )}
              {canSendToReview && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => void run(() => changeTaskStatus(current.id, 'review'))}
                >
                  Отправить на проверку
                </button>
              )}
              {canReview && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={busy}
                    onClick={() => {
                      setReworkComment('');
                      setReworkOpen(true);
                    }}
                  >
                    Вернуть на доработку
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => void run(() => changeTaskStatus(current.id, 'accepted'))}
                  >
                    Принять
                  </button>
                </>
              )}
              {isManager && (
                <>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditOpen(true)}>
                    Изменить
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={busy}
                    onClick={() => {
                      if (!confirm('Удалить задачу вместе с историей?')) return;
                      void run(async () => {
                        await deleteTask(current.id);
                        navigate(current.object ? `/objects/${current.object.id}` : '/');
                      });
                    }}
                  >
                    Удалить
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="card p-5">
              <h2 className="mb-2 text-[13px] font-medium uppercase tracking-wide text-ink-400">Описание</h2>
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-700">
                {current.description?.trim() || 'Описание не заполнено.'}
              </p>
            </div>

            <dl className="card space-y-3.5 p-5 text-sm">
              <div>
                <dt className="text-[13px] text-ink-400">Исполнитель</dt>
                <dd className="mt-0.5 font-medium">{current.assignee?.full_name ?? 'не назначен'}</dd>
              </div>
              <div>
                <dt className="text-[13px] text-ink-400">Поставил</dt>
                <dd className="mt-0.5">{current.author?.full_name ?? 'неизвестно'}</dd>
              </div>
              <div>
                <dt className="text-[13px] text-ink-400">Создана</dt>
                <dd className="mt-0.5 tabular-nums">{formatDateTime(current.created_at)}</dd>
              </div>
              <div>
                <dt className="text-[13px] text-ink-400">Обновлена</dt>
                <dd className="mt-0.5 tabular-nums">{formatDateTime(current.updated_at)}</dd>
              </div>
            </dl>
          </div>

          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[15px] font-semibold">История</h2>
              <p className="text-[13px] text-ink-400">Записи неизменяемы</p>
            </div>

            {history.loading && <Spinner />}
            {history.error && <ErrorNote message={history.error} onRetry={history.reload} />}

            <ol className="card divide-y divide-line">
              {history.data?.map((entry) => (
                <li key={entry.id} className="flex gap-3 px-4 py-3.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-line-strong" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{entry.author?.full_name ?? 'Сотрудник'}</span>{' '}
                      {entry.from_status ? (
                        <>
                          перевёл задачу из статуса «{STATUS_LABELS[entry.from_status as TaskStatus]}» в «
                          {STATUS_LABELS[entry.to_status]}»
                        </>
                      ) : (
                        <>поставил задачу</>
                      )}
                    </p>
                    {entry.comment && (
                      <p className="mt-1.5 rounded-md bg-paper px-3 py-2 text-sm text-ink-700">{entry.comment}</p>
                    )}
                    <p className="mt-1 text-[13px] text-ink-400 tabular-nums">{formatDateTime(entry.changed_at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}

      <Modal
        open={reworkOpen}
        title="Вернуть на доработку"
        onClose={() => setReworkOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setReworkOpen(false)}>
              Отмена
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !reworkComment.trim()}
              onClick={() => {
                if (!current) return;
                void run(async () => {
                  await changeTaskStatus(current.id, 'rework', reworkComment);
                  setReworkOpen(false);
                });
              }}
            >
              Вернуть
            </button>
          </>
        }
      >
        <label className="label" htmlFor="rework-comment">
          Комментарий исполнителю, обязательное поле
        </label>
        <textarea
          id="rework-comment"
          className="field min-h-24 resize-y"
          value={reworkComment}
          onChange={(event) => setReworkComment(event.target.value)}
          placeholder="Что нужно исправить"
        />
      </Modal>

      {current && (
        <EditTaskModal
          open={editOpen}
          task={current}
          workers={workers.data ?? []}
          onClose={() => setEditOpen(false)}
          onSubmit={async (values) => {
            await updateTask(current.id, values);
            await task.reload();
          }}
        />
      )}
    </div>
  );
}

function EditTaskModal({
  open,
  task,
  workers,
  onClose,
  onSubmit,
}: {
  open: boolean;
  task: Task;
  workers: { id: string; full_name: string }[];
  onClose: () => void;
  onSubmit: (values: { title: string; description: string | null; assignee_id: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [assignee, setAssignee] = useState(task.assignee_id);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Modal
      open={open}
      title="Изменить задачу"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !title.trim()}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await onSubmit({
                  title: title.trim(),
                  description: description.trim() || null,
                  assignee_id: assignee,
                });
                onClose();
              } catch (submitError) {
                setError(submitError instanceof Error ? submitError.message : 'Не удалось сохранить');
              } finally {
                setBusy(false);
              }
            }}
          >
            Сохранить
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="edit-title">
            Название
          </label>
          <input id="edit-title" className="field" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="edit-description">
            Описание
          </label>
          <textarea
            id="edit-description"
            className="field min-h-24 resize-y"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="edit-assignee">
            Исполнитель
          </label>
          <select
            id="edit-assignee"
            className="field"
            value={assignee}
            onChange={(event) => setAssignee(event.target.value)}
          >
            {workers.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.full_name}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-rework">{error}</p>}
      </div>
    </Modal>
  );
}

