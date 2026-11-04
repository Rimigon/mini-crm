import { useCallback, useEffect, useState } from 'react';

type State<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};

// Небольшой загрузчик: держит данные, ошибку и функцию обновления после действий.
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true });

  const run = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await loader();
      setState({ data, error: null, loading: false });
    } catch (error) {
      setState({ data: null, error: error instanceof Error ? error.message : 'Ошибка загрузки', loading: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void run();
  }, [run]);

  return { ...state, reload: run };
}
