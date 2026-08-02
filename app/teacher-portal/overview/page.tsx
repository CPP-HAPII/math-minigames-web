'use client';

import { useEffect, useState } from 'react';
import { useThemeStore, selectActiveProfile } from '@/lib/stores/themeStore';
import { themes } from '@/lib/themes';
import { fetchAllQuestionRows, type QuestionAttemptRow } from '@/lib/services/analyticsDataService';
import { computeSkillAccuracy, detectWeakTopics, computeAverageTimeBySkill } from '@/lib/services/analyticsService';
import SkillBarChart, { type SkillBarDatum } from '@/components/teacher/charts/SkillBarChart';

/** Matches detectWeakTopics' own default — kept as a named constant so the heading text and the call stay in sync. */
const WEAK_TOPIC_THRESHOLD = 0.6;

type Status = 'loading' | 'loaded' | 'error';

export default function ClassOverviewPage() {
  const profile = useThemeStore(selectActiveProfile);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const p = hydrated ? profile : themes[0];

  // Data fetch — mirrors PlayContent.tsx's Firestore-write effect exactly:
  // a single `result` value (null while in flight) that status/rows/error
  // are all derived from, a `cancelled` guard against a stale response
  // landing after unmount/retry, and setState only ever inside the async
  // .then()/.catch() callbacks — never synchronously in the effect body.
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

  const status: Status = result === null ? 'loading' : result.ok ? 'loaded' : 'error';
  const rows = result?.ok ? result.rows : [];
  const errorMessage = result && !result.ok ? result.message : null;

  function handleRetry() {
    setResult(null);
    setRetryToken((t) => t + 1);
  }

  // ── Styles (matches PlaceholderSection / PlayContent's card convention) ──
  const card: React.CSSProperties = {
    backgroundColor: p.headerColor,
    borderRadius: '1rem',
    padding: '1.25rem 1.75rem',
    marginBottom: '1rem',
    maxWidth: '760px',
  };

  const actionButton: React.CSSProperties = {
    backgroundColor: p.buttonColor,
    color: p.contrastTextColor,
    border: 'none',
    borderRadius: '0.6rem',
    padding: '0.55rem 1.2rem',
    fontSize: '0.9rem',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '0.75rem',
  };

  const rowList: React.CSSProperties = {
    margin: 0,
    padding: 0,
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  };

  const row = (color: string, weight = 400): React.CSSProperties => ({
    fontSize: '0.9rem',
    color,
    fontWeight: weight,
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
  });

  // ── Loading ──────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div style={{ ...card, textAlign: 'center' }}>
        <p style={{ margin: 0, color: p.contrastTextColor }}>Loading class data…</p>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div style={{ ...card, textAlign: 'center' }}>
        <p style={{ margin: 0, fontWeight: 700, color: p.contrastTextColor }}>Couldn&rsquo;t load class data.</p>
        {errorMessage && (
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', opacity: 0.8, color: p.contrastTextColor }}>
            {errorMessage}
          </p>
        )}
        <button onClick={handleRetry} style={actionButton}>
          Retry
        </button>
      </div>
    );
  }

  // ── Empty (loaded, but no attempts exist yet) ───────────────────────────
  if (rows.length === 0) {
    return (
      <div style={{ ...card, textAlign: 'center' }}>
        <p style={{ margin: 0, fontWeight: 700, color: p.contrastTextColor }}>No data yet</p>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', opacity: 0.85, color: p.contrastTextColor }}>
          No students have completed any questions yet.
        </p>
      </div>
    );
  }

  // ── Loaded ───────────────────────────────────────────────────────────────
  const distinctStudents = new Set(rows.map((r) => r.userId)).size;
  const accuracy = computeSkillAccuracy(rows);
  const weakTopics = detectWeakTopics(accuracy, WEAK_TOPIC_THRESHOLD);
  const timing = computeAverageTimeBySkill(rows);
  const weakSkillSet = new Set(weakTopics.map((w) => w.skill));

  const accuracyChartData: SkillBarDatum[] = accuracy.map((a) => ({
    skill: a.skill,
    value: Math.round(a.accuracy * 100),
    valueLabel: `${Math.round(a.accuracy * 100)}%`,
    detailLabel: `${a.correct}/${a.attempts} attempt${a.attempts === 1 ? '' : 's'} correct`,
    highlighted: weakSkillSet.has(a.skill),
  }));

  const timingChartData: SkillBarDatum[] = timing.map((t) => ({
    skill: t.skill,
    value: t.averageTimeTakenInSeconds,
    valueLabel: `${t.averageTimeTakenInSeconds.toFixed(1)}s`,
    detailLabel: `${t.attempts} attempt${t.attempts === 1 ? '' : 's'}`,
  }));

  const detailsSummary: React.CSSProperties = {
    fontSize: '0.8rem',
    color: p.contrastTextColor,
    opacity: 0.75,
    cursor: 'pointer',
    marginTop: '0.75rem',
  };

  return (
    <div>
      <div style={card}>
        <p style={{ margin: 0, fontSize: '0.95rem', color: p.contrastTextColor }}>
          <strong>{distinctStudents}</strong> student{distinctStudents === 1 ? '' : 's'} &middot;{' '}
          <strong>{rows.length}</strong> question attempt{rows.length === 1 ? '' : 's'} logged
        </p>
      </div>

      <div style={card}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.75rem', color: p.contrastTextColor }}>
          Accuracy by Skill
        </h2>
        <SkillBarChart
          data={accuracyChartData}
          profile={p}
          axisFormatter={(v) => `${v}%`}
          domain={[0, 100]}
          highlightedWord="weak"
        />
        <details>
          <summary style={detailsSummary}>View as table</summary>
          <ul style={{ ...rowList, marginTop: '0.5rem' }}>
            {accuracy.map((a) => (
              <li key={a.skill} style={row(weakSkillSet.has(a.skill) ? p.clearAnswerButtonColor : p.contrastTextColor)}>
                <span>{a.skill}</span>
                <span>
                  {a.correct}/{a.attempts} ({Math.round(a.accuracy * 100)}%)
                </span>
              </li>
            ))}
          </ul>
        </details>
      </div>

      <div style={card}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.75rem', color: p.contrastTextColor }}>
          Weak Topics (below {Math.round(WEAK_TOPIC_THRESHOLD * 100)}%)
        </h2>
        {weakTopics.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.9rem', color: p.contrastTextColor, opacity: 0.85 }}>
            No weak topics — every skill is at or above {Math.round(WEAK_TOPIC_THRESHOLD * 100)}% class-wide.
          </p>
        ) : (
          <ul style={rowList}>
            {weakTopics.map((w) => (
              <li key={w.skill} style={row(p.clearAnswerButtonColor, 700)}>
                <span>{w.skill}</span>
                <span>
                  {w.correct}/{w.attempts} ({Math.round(w.accuracy * 100)}%)
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={card}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.75rem', color: p.contrastTextColor }}>
          Average Time per Skill
        </h2>
        <SkillBarChart
          data={timingChartData}
          profile={p}
          axisFormatter={(v) => `${v}s`}
          highlightedWord="weak"
        />
        <details>
          <summary style={detailsSummary}>View as table</summary>
          <ul style={{ ...rowList, marginTop: '0.5rem' }}>
            {timing.map((t) => (
              <li key={t.skill} style={row(p.contrastTextColor)}>
                <span>{t.skill}</span>
                <span>
                  {t.averageTimeTakenInSeconds.toFixed(1)}s avg ({t.attempts} attempt{t.attempts === 1 ? '' : 's'})
                </span>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}
