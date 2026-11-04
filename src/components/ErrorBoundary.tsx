import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Ошибка интерфейса', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="grid min-h-dvh place-items-center bg-paper px-6">
        <div className="max-w-[420px]">
          <p className="micro">ошибка интерфейса</p>
          <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.02em]">Что-то сломалось</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            Обновите страницу и попробуйте снова. Если ошибка повторяется, передайте администратору
            текст ниже.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface px-3 py-2 text-[12px] text-ink-500">
            {this.state.error.message}
          </pre>
          <button type="button" className="btn btn-primary mt-5" onClick={() => location.reload()}>
            Обновить страницу
          </button>
        </div>
      </div>
    );
  }
}

