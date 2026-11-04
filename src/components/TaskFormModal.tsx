import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Modal } from './Modal';
import type { Profile } from '../lib/types';

type Props = {
  open: boolean;
  workers: Profile[];
  onClose: () => void;
  onSubmit: (values: {
    title: string;
    description: string | null;
    assignee_id: string;
  }) => Promise<void>;
};

export function TaskFormModal({ open, workers, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setDescription('');
    setAssignee(workers[0]?.id ?? '');
    setError(null);
  }, [open, workers]);

  async function submit(event: FormEvent) {
    event.preventDefault();
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
  }

  return (
    <Modal
      open={open}
      title="Новая задача"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" form="task-form" className="btn btn-primary" disabled={busy || !assignee}>
            {busy ? 'Сохраняем…' : 'Создать'}
          </button>
        </>
      }
    >
      <form id="task-form" onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="task-title">
            Название
          </label>
          <input
            id="task-title"
            className="field"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Заказать бетон М300 на плиту"
          />
        </div>
        <div>
          <label className="label" htmlFor="task-description">
            Описание
          </label>
          <textarea
            id="task-description"
            className="field min-h-24 resize-y"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Что именно нужно сделать"
          />
        </div>
        <div>
          <label className="label" htmlFor="task-assignee">
            Исполнитель
          </label>
          <select
            id="task-assignee"
            className="field"
            value={assignee}
            onChange={(event) => setAssignee(event.target.value)}
            required
          >
            {workers.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.full_name}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-rework">{error}</p>}
      </form>
    </Modal>
  );
}
