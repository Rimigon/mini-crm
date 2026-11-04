import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `rounded-md px-2.5 py-1.5 text-sm transition-colors ${
          isActive
            ? 'bg-accent-soft font-medium text-accent'
            : 'text-ink-500 hover:bg-paper hover:text-ink-900'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export function Layout() {
  const { profile, email, signOut } = useAuth();
  const isManager = profile?.role === 'manager';

  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-5">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-md bg-accent text-[13px] font-semibold text-white">
              П
            </span>
            <span className="text-[15px] font-semibold tracking-tight">Прораб</span>
          </Link>

          <nav className="flex items-center gap-1">
            <NavItem to="/">Объекты</NavItem>
            {!isManager && <NavItem to="/my-tasks">Мои задачи</NavItem>}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-[13px] font-medium text-ink-900">{profile?.full_name}</div>
              <div className="text-xs text-ink-400">
                {isManager ? 'Постановщик' : 'Исполнитель'}
                {email ? ` · ${email}` : ''}
              </div>
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => void signOut()}>
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        <Outlet />
      </main>
    </div>
  );
}
