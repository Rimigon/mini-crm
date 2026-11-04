export function Spinner({ label = 'Загрузка' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-10 text-sm text-ink-500">
      <span className="size-4 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
      {label}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-rework/25 bg-rework-soft px-4 py-3 text-sm text-rework">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn btn-secondary ml-auto" onClick={onRetry}>
          Повторить
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-start gap-3 px-6 py-10">
      <p className="text-[15px] font-medium">{title}</p>
      {hint && <p className="max-w-md text-sm text-ink-500">{hint}</p>}
      {action}
    </div>
  );
}
