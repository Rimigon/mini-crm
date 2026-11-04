import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../auth/useAuth';

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
    <div className="grid min-h-dvh bg-paper lg:grid-cols-[1.1fr_1fr]">
      <section className="flex flex-col justify-between px-6 py-8 sm:px-10 lg:border-r lg:border-line lg:px-14 lg:py-12">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display text-[19px] leading-none">Прораб</span>
          <span className="text-[11px] text-ink-400">мини-CRM строительной компании</span>
        </div>

        <div className="mt-12 max-w-[460px] lg:mt-0">
          <h1 className="text-[30px] leading-[1.15] tracking-[-0.02em] sm:text-[36px]">
            Задачи по объектам, приёмка и история
          </h1>
          <p className="mt-5 max-w-[380px] text-[15px] leading-relaxed text-ink-500">
            Постановщик раздаёт задачи по стройкам, исполнитель ведёт их до приёмки. Каждый переход
            подписан и остаётся в истории.
          </p>

          <div className="mt-10 grid max-w-[460px] gap-6 border-t border-line pt-6 sm:grid-cols-2">
            <div>
              <p className="micro">постановщик</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-700">
                Заводит объекты, ставит задачи и принимает работу или возвращает на доработку.
              </p>
            </div>
            <div>
              <p className="micro">исполнитель</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-700">
                Видит только свои задачи, берёт их в работу и отправляет на проверку.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-12 text-[11px] text-ink-400 lg:mt-0">Москва · 2026</p>
      </section>

      <section className="flex items-center justify-center border-t border-line px-6 py-12 sm:px-10 lg:border-t-0">
        <div className="w-full max-w-[340px]">
          <p className="micro">вход в систему</p>
          <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.02em]">Почта и пароль</h2>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div>
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

            <div>
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
              <p className="rounded-lg border border-rework/20 bg-rework-soft px-3 py-2 text-[13px] text-rework">
                {message ?? error}
              </p>
            )}

            <button type="submit" className="btn btn-primary w-full" disabled={busy}>
              {busy ? 'Проверяем…' : 'Войти'}
            </button>
          </form>

          <div className="mt-10 border-t border-line pt-5">
            <p className="micro">демо-доступы</p>
            <ul className="mt-2 space-y-1 text-[13px] text-ink-500">
              <li>
                постановщик <span className="text-ink-700">rudik@demo.ru</span>
              </li>
              <li>
                исполнители <span className="text-ink-700">ivanov@demo.ru</span>,{' '}
                <span className="text-ink-700">petrova@demo.ru</span>
              </li>
              <li>
                пароль у всех <span className="text-ink-700">Demo1234</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

