import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { errorMessage } from './useApi';
import type { ApiMeta } from '../lib/api';
import type { Payment } from '../lib/types';

interface Params {
  status?: string;
  type?: string;
  search?: string;
  [key: string]: string | undefined;
}

export function usePaymentList(endpoint: string, initial: Params = {}) {
  const [params, setParams] = useState<Params>({ status: '', type: '', ...initial });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Payment[]>([]);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const initialRef = useRef(true);
  const [initialLoading, setInitialLoading] = useState(true);

  const load = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    const query: Record<string, string | number> = { page, limit: 20, ...params };
    api
      .get<Payment[]>(endpoint, query)
      .then((res) => {
        if (controller.signal.aborted) return;
        setData(res.data);
        setMeta(res.meta ?? null);
        setError('');
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        setError(errorMessage(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [endpoint, params, page]);

  useEffect(() => {
    const cleanup = load();
    if (initialRef.current) {
      initialRef.current = false;
      setInitialLoading(false);
    }
    return cleanup;
  }, [load]);

  const updateParam = (key: string, value: string) => {
    setPage(1);
    setParams((p) => ({ ...p, [key]: value }));
  };

  return { params, updateParam, setPage, page, data, meta, loading, initialLoading, error, reload: load };
}
