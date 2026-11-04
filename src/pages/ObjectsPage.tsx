import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '../auth/AuthContext';
import { createObject, deleteObject, fetchObjects, updateObject } from '../lib/api';
import { useAsync } from '../hooks/useAsync';
import { EmptyState, ErrorNote, Spinner } from '../components/States';
import { ObjectFormModal } from '../components/ObjectFormModal';
import { pluralize } from '../lib/format';
import type { SiteObject } from '../lib/types';

export function ObjectsPage() {
  const profile = useProfile();
  const isManager = profile.role === 'manager';
  const { data, error, loading, reload } = useAsync(fetchObjects);
  const [editing, setEditing] = useState<SiteObject | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(object: SiteObject) {
    setEditing(object);
    setModalOpen(true);
  }

  async function remove(object: SiteObject) {
    if (!confirm(`Удалить объект «${object.name}» вместе с задачами?`)) return;
    setActionError(null);
    try {
      await deleteObject(object.id);
      await reload();
    } catch (removeError) {
      setActionError(removeError instanceof Error ? removeError.message : 'Не удалось удалить');
    }
  }

  const total = data?.length ?? 0;

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="micro">
            {total > 0
              ? `${total} ${pluralize(total, 'объект', 'объекта', 'объектов')}`
              : 'список объектов'}
          </p>
          <h1 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.025em] sm:text-[34px]">
            Объекты
          </h1>
        </div>
        {isManager && (
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            Новый объект
          </button>
        )}
      </header>

      <p className="mt-4 max-w-[600px] text-[15px] leading-relaxed text-ink-500">
        {isManager
          ? 'Стройки компании. Задачи ставятся внутри объекта, исполнитель видит только свои.'
          : 'Объекты, на которых у вас есть задачи.'}
      </p>

      {actionError && (
        <div className="mt-6">
          <ErrorNote message={actionError} />
        </div>
      )}

      {loading && <Spinner label="читаем объекты" />}
      {error && <ErrorNote message={error} onRetry={reload} />}

      {!loading && !error && data && data.length === 0 && (
        <div className="mt-10">
          <EmptyState
            title={isManager ? 'Объектов пока нет' : 'Задач вам ещё не назначали'}
            hint={
              isManager
                ? 'Заведите первую стройку, чтобы ставить по ней задачи.'
                : 'Когда постановщик назначит задачу, объект появится в списке.'
            }
            action={
              isManager ? (
                <button type="button" className="btn btn-primary" onClick={openCreate}>
                  Новый объект
                </button>
              ) : undefined
            }
          />
        </div>
      )}

      {data && data.length > 0 && (
        <div className="mt-10 border-t border-line">
          {data.map((object, index) => {
            const tasks = object.tasks ?? [];
            const accepted = tasks.filter((task) => task.status === 'accepted').length;
            const share = tasks.length > 0 ? Math.round((accepted / tasks.length) * 100) : 0;

            return (
              <div key={object.id} className="group row-link relative border-b border-line">
                <div className="grid grid-cols-[32px_minmax(0,1fr)] items-start gap-4 py-6 sm:grid-cols-[40px_minmax(0,1fr)_190px] sm:items-center sm:gap-6">
                  <span className="num pt-1 text-[12px] text-ink-400 sm:pt-0">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <Link to={`/objects/${object.id}`} className="min-w-0 outline-offset-4">
                    <span className="block text-[16px] font-medium leading-snug text-ink-900 transition-colors duration-150 group-hover:text-accent sm:text-[17px]">
                      {object.name}
                    </span>
                    <span className="mt-1 block text-[13px] text-ink-500">{object.address}</span>
                    <span className="mt-2 flex items-center gap-3 text-[12px] text-ink-400 sm:hidden">
                      <span>{tasks.length} {pluralize(tasks.length, 'задача', 'задачи', 'задач')}</span>
                      <span className="text-line-strong">·</span>
                      <span>принято {accepted}</span>
                    </span>
                  </Link>

                  <div className="hidden sm:block">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[13px] text-ink-700">
                        {tasks.length} {pluralize(tasks.length, 'задача', 'задачи', 'задач')}
                      </span>
                      <span className="num text-[12px] text-ink-400">принято {accepted}</span>
                    </div>
                    <div className="mt-2 flex h-[3px] w-full overflow-hidden rounded-full bg-line">
                      <span
                        className="h-full rounded-full bg-accepted transition-[width] duration-300"
                        style={{ width: `${share}%` }}
                        aria-hidden
                      />
                    </div>
                  </div>
                </div>

                {isManager && (
                  <div className="absolute right-0 top-1/2 hidden -translate-y-1/2 gap-1 bg-paper pl-4 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 sm:flex">
                    <button
                      type="button"
                      className="btn btn-secondary px-2.5 py-1 text-[12px]"
                      onClick={() => openEdit(object)}
                    >
                      Изменить
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger px-2.5 py-1 text-[12px]"
                      onClick={() => void remove(object)}
                    >
                      Удалить
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ObjectFormModal
        open={modalOpen}
        initial={editing}
        onClose={() => setModalOpen(false)}
        onSubmit={async (values) => {
          if (editing) await updateObject(editing.id, values);
          else await createObject(values);
          await reload();
        }}
      />
    </div>
  );
}



