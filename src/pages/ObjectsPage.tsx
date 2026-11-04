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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Объекты</h1>
          <p className="mt-1 text-sm text-ink-500">
            {isManager
              ? 'Стройки компании и задачи по ним'
              : 'Объекты, на которых у вас есть задачи'}
          </p>
        </div>
        {isManager && (
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            Новый объект
          </button>
        )}
      </div>

      {actionError && <ErrorNote message={actionError} />}
      {loading && <Spinner />}
      {error && <ErrorNote message={error} onRetry={reload} />}

      {!loading && !error && data && data.length === 0 && (
        <EmptyState
          title={isManager ? 'Объектов пока нет' : 'Вам ещё не назначили задачи'}
          hint={
            isManager
              ? 'Добавьте первую стройку, чтобы ставить по ней задачи.'
              : 'Как только постановщик назначит задачу, объект появится здесь.'
          }
          action={
            isManager ? (
              <button type="button" className="btn btn-primary" onClick={openCreate}>
                Новый объект
              </button>
            ) : undefined
          }
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {data?.map((object) => {
          const tasks = object.tasks ?? [];
          const active = tasks.filter((task) => task.status !== 'accepted').length;
          return (
            <div key={object.id} className="card group relative p-4 transition-colors hover:border-line-strong">
              <Link to={`/objects/${object.id}`} className="block">
                <h2 className="pr-16 text-[15px] font-medium leading-snug">{object.name}</h2>
                <p className="mt-1 text-sm text-ink-500">{object.address}</p>
                <p className="mt-3 flex items-center gap-3 text-[13px] text-ink-400">
                  <span className="tabular-nums">
                    {tasks.length} {pluralize(tasks.length, 'задача', 'задачи', 'задач')}
                  </span>
                  <span aria-hidden>·</span>
                  <span className="tabular-nums">{active} в работе</span>
                </p>
              </Link>
              {isManager && (
                <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <button
                    type="button"
                    className="btn btn-secondary px-2 py-1 text-xs"
                    onClick={() => openEdit(object)}
                  >
                    Изменить
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger px-2 py-1 text-xs"
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
