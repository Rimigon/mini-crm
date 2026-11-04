import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useProfile } from '../auth/useAuth';
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
import { StatusBadge, StatusDot } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { formatDate, formatDateTime } from '../lib/format';
import { availableTaskActions } from '../lib/rules';
import { LIMITS } from '../lib/limits';
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
  const actions = current
    ? availableTaskActions(current.status, profile.role, current.assignee_id === profile.id)
    : [];
  const canTakeWork = actions.includes('take');
  const canSendToReview = actions.includes('submit');
  const canReview = actions.includes('accept');

  return (
    <div>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-500 transition-colors duration-150 hover:text-ink-900"
        onClick={() => navigate(-1)}
      >
        ← Назад
      </button>

      {actionError && (
        <div className="mt-6">
          <ErrorNote message={actionError} />
        </div>
      )}
      {task.loading && <Spinner label="читаем задачу" />}
      {task.error && <LoadError message={task.error} onRetry={task.reload} />}

      {current && (
        <>
          <header className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={current.status} />
                <span className="text-[12px] text-ink-400">
                  поставлена <span className="num">{formatDate(current.created_at)}</span>
                </span>
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
                  {canReview && (
                    <span className="mx-1 hidden h-6 w-px self-center bg-line sm:block" aria-hidden />
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost px-2.5 py-1 text-[13px]"
                    onClick={() => setEditOpen(true)}
                  >
                    Изменить
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost px-2.5 py-1 text-[13px] text-rework hover:bg-rework-soft"
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

            <h1 className="mt-5 max-w-[760px] text-[26px] font-semibold leading-tight tracking-[-0.025em] sm:text-[31px]">
              {current.title}
            </h1>

            {current.object && (
              <Link
                to={`/objects/${current.object.id}`}
                className="mt-3 inline-flex flex-wrap items-baseline gap-2 text-[13px] text-ink-500 transition-colors duration-150 hover:text-accent"
              >
                <span className="underline decoration-line-strong underline-offset-4">
                  {current.object.name}
                </span>
                <span className="text-ink-400">{current.object.address}</span>
              </Link>
            )}
          </header>

          <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_290px] lg:gap-12">
            <div className="min-w-0">
              <section>
                <h2 className="micro">описание</h2>
                <p className="mt-3 whitespace-pre-line text-[16px] leading-[1.7] text-ink-700">
                  {current.description?.trim() || 'Описание не заполнено.'}
                </p>
              </section>

              <section className="mt-12">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="text-[19px] font-semibold tracking-[-0.02em]">История</h2>
                  <span className="text-[12px] text-ink-400">записи неизменяемы</span>
                </div>

                {history.loading && <Spinner label="читаем историю" />}
                {history.error && <ErrorNote message={history.error} onRetry={history.reload} />}

                <ol className="mt-5 border-t border-line">
                  {history.data?.map((entry) => (
                    <li
                      key={entry.id}
                      className="grid gap-1 border-b border-line py-4 sm:grid-cols-[104px_minmax(0,1fr)] sm:gap-5"
                    >
                      <span className="num text-[12px] leading-6 text-ink-400">
                        {formatDateTime(entry.changed_at)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[14px] leading-6">
                          <span className="mr-1.5 inline-block align-middle">
                            <StatusDot status={entry.to_status} />
                          </span>
                          <span className="font-medium">{entry.author?.full_name ?? 'Сотрудник'}</span>{' '}
                          {entry.from_status ? (
                            <span className="text-ink-500">
                              перевёл из «{STATUS_LABELS[entry.from_status as TaskStatus]}» в «
                              {STATUS_LABELS[entry.to_status]}»
                            </span>
                          ) : (
                            <span className="text-ink-500">поставил задачу</span>
                          )}
                        </p>
                        {entry.comment && (
                          <p className="mt-2 border-l-2 border-line-strong pl-3 text-[13px] leading-relaxed text-ink-700">
                            {entry.comment}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </div>

            <aside className="card p-5 lg:sticky lg:top-24">
              <dl className="text-[13px]">
                <div className="border-b border-line py-3 first:pt-0">
                  <dt className="micro">исполнитель</dt>
                  <dd className="mt-1 font-medium">{current.assignee?.full_name ?? 'не назначен'}</dd>
                </div>
                <div className="border-b border-line py-3">
                  <dt className="micro">поставил</dt>
                  <dd className="mt-1">{current.author?.full_name ?? 'неизвестно'}</dd>
                </div>
                <div className="border-b border-line py-3">
                  <dt className="micro">создана</dt>
                  <dd className="num mt-1">{formatDateTime(current.created_at)}</dd>
                </div>
                <div className="py-3 pb-0">
                  <dt className="micro">обновлена</dt>
                  <dd className="num mt-1">{formatDateTime(current.updated_at)}</dd>
                </div>
              </dl>
            </aside>
          </div>
        </>
      )}

      <Modal
        open={reworkOpen}
        title="Вернуть на доработку"
        eyebrow="комментарий обязателен"
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
          Что нужно исправить
        </label>
        <textarea
          id="rework-comment"
          className="field min-h-24 resize-y"
          maxLength={LIMITS.comment}
          value={reworkComment}
          onChange={(event) => setReworkComment(event.target.value)}
          placeholder="Без комментария задача не вернётся"
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
      <div className="space-y-5">
        <div>
          <label className="label" htmlFor="edit-title">
            Название
          </label>
          <input
            id="edit-title"
            className="field"
            maxLength={LIMITS.taskTitle}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="edit-description">
            Описание
          </label>
          <textarea
            id="edit-description"
            className="field min-h-24 resize-y"
            maxLength={LIMITS.taskDescription}
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

