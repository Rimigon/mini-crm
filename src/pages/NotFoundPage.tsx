import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div>
      <p className="micro">404</p>
      <h1 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.025em] sm:text-[34px]">
        Страница не найдена
      </h1>
      <p className="mt-4 max-w-[520px] text-[15px] leading-relaxed text-ink-500">
        Такой адрес не открывается. Возможно, ссылка устарела или запись удалили.
      </p>
      <Link to="/" className="btn btn-primary mt-7">
        К объектам
      </Link>
    </div>
  );
}

