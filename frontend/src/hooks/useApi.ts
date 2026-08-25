import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { ApiClientError, TIMEOUT_MESSAGE, type ApiResponse } from '../lib/api';

export function errorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  if (err instanceof ApiClientError) return err.message;
  if (err instanceof Error && err.name === 'AbortError') return '';
  if (err instanceof DOMException && err.name === 'TimeoutError') return TIMEOUT_MESSAGE;
  if (err instanceof Error && err.message === 'The operation was aborted.') return TIMEOUT_MESSAGE;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

interface UseApiResult<T> {
  data: T | null;
  meta: ApiResponse<T>['meta'];
  loading: boolean;
  initialLoading: boolean;
  error: string;
  reload: () => void;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

export function useApi<T>(
  fetcher: (signal: AbortSignal) => Promise<ApiResponse<T>>,
  deps: DependencyList = [],
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [meta, setMeta] = useState<ApiResponse<T>['meta']>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  // true only until the FIRST fetch completes (i.e. a page/route navigation).
  // Refetches (search/filter/pagination/reload) keep this false so they use a
  // local loading indicator instead of the global full-screen loader.
  const initialRef = useRef(true);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetcher(controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setData(res.data);
        setMeta(res.meta);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('useApi request failed:', err);
        setError(errorMessage(err));
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setLoading(false);
        if (initialRef.current) {
          initialRef.current = false;
          setInitialLoading(false);
        }
      });
    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  return { data, meta, loading, initialLoading, error, reload, setData };
}
