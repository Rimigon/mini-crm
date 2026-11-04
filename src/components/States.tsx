import { Link } from 'react-router-dom';

export function Spinner({ label = 'Загрузка' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2.5 py-8">
      <span className="size-3.5 animate-spin rounded-full border-[1.5px] border-line-strong border-t-accent" />
      <span className="text-[13px] text-ink-400">{label}</span>
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-rework/20 bg-rework-soft px-4 py-3 text-[13px] text-rework">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn btn-secondary ml-auto bg-surface/60" onClick={onRetry}>
          Повторить
        </button>
      )}
    </div>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  if (/недоступн|не найден/i.test(message)) {
    return (
      <div className="card mt-6 px-7 py-8">
        <p className="font-display text-[19px] leading-snug">Запись недоступна</p>
        <p className="mt-2 max-w-md text-sm text-ink-500">
          {message}. Скорее всего, она назначена другому сотруднику или её удалили.
        </p>
        <Link to="/" className="btn btn-secondary mt-5">
          К списку объектов
        </Link>
      </div>
    );
  }

  return <ErrorNote message={message} onRetry={onRetry} />;
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong px-7 py-10">
      <p className="font-display text-[17px] leading-snug">{title}</p>
      {hint && <p className="mt-2 max-w-md text-sm text-ink-500">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
