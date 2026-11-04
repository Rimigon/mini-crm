import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `whitespace-nowrap py-1 text-[13px] transition-colors duration-150 sm:text-sm ${
          isActive ? 'text-ink-900' : 'text-ink-500 hover:text-ink-900'
        }`
      }
    >
      {({ isActive }) => (
        <span
          className={`border-b-2 pb-0.5 transition-colors duration-150 ${
            isActive ? 'border-accent' : 'border-transparent'
          }`}
        >
          {children}
        </span>
      )}
    </NavLink>
  );
}

export function Layout() {
  const { profile, email, signOut } = useAuth();
  const isManager = profile?.role === 'manager';
  const location = useLocation();

  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-4 px-5 sm:gap-10 sm:px-6">
          <Link to="/" className="flex items-baseline gap-2.5">
            <span className="font-display text-[19px] leading-none">Прораб</span>
            <span className="hidden text-[11px] text-ink-400 sm:inline">объекты и задачи</span>
          </Link>

          <nav className="flex items-center gap-4 sm:gap-6">
            <NavItem to="/">Объекты</NavItem>
            {!isManager && <NavItem to="/my-tasks">Мои задачи</NavItem>}
          </nav>

          <div className="ml-auto flex items-center gap-3 sm:gap-4">
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-[13px] font-medium">{profile?.full_name}</div>
              <div className="text-[11px] text-ink-400">
                {isManager ? 'постановщик' : 'исполнитель'}
                {email ? ` · ${email}` : ''}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost px-1.5 py-1 text-[13px] sm:px-2"
              onClick={() => void signOut()}
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1120px] px-5 py-9 sm:px-6 sm:py-12">
        <div key={location.pathname} className="page-in">
          <Outlet />
        </div>
      </main>

      <footer className="mx-auto max-w-[1120px] px-5 pb-10 sm:px-6">
        <div className="rule flex flex-col gap-1 pt-4 text-[11px] text-ink-400 sm:flex-row sm:items-center sm:justify-between">
          <span>Прораб · мини-CRM строительной компании</span>
          <span>данные защищены правилами доступа в базе</span>
        </div>
      </footer>
    </div>
  );
}
