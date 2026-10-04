import { useCallback, useEffect, useState } from 'react';
import { api, message } from './api';

export function useResource<T>(path: string) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setData(undefined);
    setLoading(true);
    setError('');
    api<T>(path, { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, revision]);
  return { data, error, loading, reload };
}
export const dateTime = (value: string) =>
  new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
export const number = (value: string | number) =>
  Number(value).toLocaleString('th-TH', { maximumFractionDigits: 2 });
export const languageName = (value: string) => (value === 'CPP' ? 'C++' : 'Python');
export const duration = (value: number | null | undefined, unit = 'ms') =>
  value == null || value > 1e12 ? '—' : `${number(value)} ${unit}`;
