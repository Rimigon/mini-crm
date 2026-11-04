import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const { signIn, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await signIn(email, password);
    } catch (signInError) {
      setMessage(signInError instanceof Error ? signInError.message : 'Не удалось войти');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-paper px-4 py-10">
      <div className="w-full max-w-[380px]">
        <div className="mb-7">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-md bg-accent text-sm font-semibold text-white">
              П
            </span>
            <span className="text-[17px] font-semibold tracking-tight">Прораб</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Вход в систему</h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Учётные записи заводит администратор, регистрация закрыта.
          </p>
        </div>

        <form onSubmit={onSubmit} className="card p-5">
          <div className="mb-4">
            <label className="label" htmlFor="email">
              Почта
            </label>
            <input
              id="email"
              type="email"
              className="field"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.ru"
            />
          </div>

          <div className="mb-5">
            <label className="label" htmlFor="password">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              className="field"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </div>

          {(message || error) && (
            <p className="mb-4 rounded-lg border border-rework/25 bg-rework-soft px-3 py-2 text-sm text-rework">
              {message ?? error}
            </p>
          )}

          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy ? 'Проверяем…' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}
