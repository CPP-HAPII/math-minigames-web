import { useEffect, useState } from 'react';
import { fetchAllQuestionRows, type QuestionAttemptRow } from '@/lib/services/analyticsDataService';

export type ClassAnalyticsStatus = 'loading' | 'loaded' | 'error';

export interface ClassAnalytics {
  status: ClassAnalyticsStatus;
  rows: QuestionAttemptRow[];
  errorMessage: string | null;
  retry: () => void;
}

/**
 * One class-wide fetch for the whole teacher portal. Same pattern the old
 * per-section pages each duplicated: a single `result` value (null while in
 * flight) that status/rows/error derive from, a `cancelled` guard against a
 * stale response landing after unmount/retry, and setState only inside the
 * async callbacks — never synchronously in the effect body.
 */
export function useClassAnalytics(): ClassAnalytics {
  const [result, setResult] = useState<
    { ok: true; rows: QuestionAttemptRow[] } | { ok: false; message: string } | null
  >(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetchAllQuestionRows()
      .then((fetched) => {
        if (cancelled) return;
        setResult({ ok: true, rows: fetched });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResult({ ok: false, message: err instanceof Error ? err.message : String(err) });
      });

    return () => {
      cancelled = true;
    };
  }, [retryToken]);

  return {
    status: result === null ? 'loading' : result.ok ? 'loaded' : 'error',
    rows: result?.ok ? result.rows : [],
    errorMessage: result && !result.ok ? result.message : null,
    retry: () => {
      setResult(null);
      setRetryToken((t) => t + 1);
    },
  };
}
