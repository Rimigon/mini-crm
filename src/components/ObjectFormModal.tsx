import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Modal } from './Modal';
import type { SiteObject } from '../lib/types';

type Props = {
  open: boolean;
  initial?: SiteObject | null;
  onClose: () => void;
  onSubmit: (values: { name: string; address: string }) => Promise<void>;
};

export function ObjectFormModal({ open, initial, onClose, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setAddress(initial?.address ?? '');
    setError(null);
  }, [open, initial]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ name: name.trim(), address: address.trim() });
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
      title={initial ? 'Изменить объект' : 'Новый объект'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" form="object-form" className="btn btn-primary" disabled={busy}>
            {busy ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </>
      }
    >
      <form id="object-form" onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="object-name">
            Название
          </label>
          <input
            id="object-name"
            className="field"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="ЖК «Северный парк», корпус 3"
          />
        </div>
        <div>
          <label className="label" htmlFor="object-address">
            Адрес
          </label>
          <input
            id="object-address"
            className="field"
            required
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="г. Воскресенск, ул. Ленина, 12"
          />
        </div>
        {error && <p className="text-sm text-rework">{error}</p>}
      </form>
    </Modal>
  );
}
