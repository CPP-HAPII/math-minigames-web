'use client';

import { useEffect, useState } from 'react';
import { useThemeStore, selectActiveProfile } from '@/lib/stores/themeStore';
import { themes } from '@/lib/themes';
import { fetchAllQuestionRows, type QuestionAttemptRow } from '@/lib/services/analyticsDataService';
import { computeSkillAccuracyByStudent, detectWeakTopics, computeAverageTimeBySkill } from '@/lib/services/analyticsService';
import SkillBarChart, { type SkillBarDatum } from '@/components/teacher/charts/SkillBarChart';

/** Matches detectWeakTopics' own default — kept as a named constant so the heading text and the call stay in sync. */
const WEAK_TOPIC_THRESHOLD = 0.6;

type Status = 'loading' | 'loaded' | 'error';

export default function StudentDetailPage() {
  const profile = useThemeStore(selectActiveProfile);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const p = hydrated ? profile : themes[0];

  // Data fetch — identical pattern to app/teacher-portal/overview/page.tsx:
  // a single `result` value (null while in flight) that status/rows/error
  // are all derived from, a `cancelled` guard, setState only inside the
  // async .then()/.catch() callbacks. One fetch here serves both the student
  // picker (distinct userIds) and each student's detail slice — no per-student
  // re-fetch when the selection changes.
  const [result, setResult] = useState<
    { ok: true; rows: QuestionAttemptRow[] } | { ok: false; message: string } | null
  >(null);
  const [retryToken, setRetryToken] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

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

  // ── Styles (matches Class Overview's card/row convention) ───────────────
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

  // Student-picker button — same active/inactive pattern as home/page.tsx's selectorBtn.
  const studentBtn = (active: boolean): React.CSSProperties => ({
    backgroundColor: active ? p.buttonColor : p.backgroundColor,
    color: p.textColor,
    border: `1.5px solid ${p.textColor}22`,
    borderRadius: '0.5rem',
    padding: '0.5rem 1.1rem',
    fontWeight: active ? 700 : 400,
    cursor: 'pointer',
    fontSize: '0.95rem',
    transition: 'background-color 0.15s',
  });

  // ── Loading ──────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div style={{ ...card, textAlign: 'center' }}>
        <p style={{ margin: 0, color: p.contrastTextColor }}>Loading student data…</p>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div style={{ ...card, textAlign: 'center' }}>
        <p style={{ margin: 0, fontWeight: 700, color: p.contrastTextColor }}>Couldn&rsquo;t load student data.</p>
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

  // ── Empty (loaded, but no attempts exist yet — no students to pick from) ─
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
  const studentIds = [...new Set(rows.map((r) => r.userId))].sort();
  const accuracyByStudent = computeSkillAccuracyByStudent(rows);

  const selectedRows = selectedUserId ? rows.filter((r) => r.userId === selectedUserId) : [];
  const selectedAccuracy = selectedUserId ? accuracyByStudent.filter((a) => a.userId === selectedUserId) : [];
  const selectedWeakTopics = detectWeakTopics(selectedAccuracy, WEAK_TOPIC_THRESHOLD);
  const selectedTiming = selectedUserId ? computeAverageTimeBySkill(selectedRows) : [];
  const selectedWeakSkillSet = new Set(selectedWeakTopics.map((w) => w.skill));

  const accuracyChartData: SkillBarDatum[] = selectedAccuracy.map((a) => ({
    skill: a.skill,
    value: Math.round(a.accuracy * 100),
    valueLabel: `${Math.round(a.accuracy * 100)}%`,
    detailLabel: `${a.correct}/${a.attempts} attempt${a.attempts === 1 ? '' : 's'} correct`,
    highlighted: selectedWeakSkillSet.has(a.skill),
  }));

  const timingChartData: SkillBarDatum[] = selectedTiming.map((t) => ({
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
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.75rem', color: p.contrastTextColor }}>
          Select a Student
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {studentIds.map((id) => (
            <button key={id} onClick={() => setSelectedUserId(id)} style={studentBtn(id === selectedUserId)}>
              {id}
            </button>
          ))}
        </div>
      </div>

      {selectedUserId === null ? (
        <div style={{ ...card, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: p.contrastTextColor, opacity: 0.85 }}>
            Select a student above to view their accuracy, weak topics, and timing.
          </p>
        </div>
      ) : (
        <>
          <div style={card}>
            <p style={{ margin: 0, fontSize: '0.95rem', color: p.contrastTextColor }}>
              <strong>{selectedUserId}</strong> &middot; <strong>{selectedRows.length}</strong> question attempt
              {selectedRows.length === 1 ? '' : 's'} logged
            </p>
          </div>

          <div style={card}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.75rem', color: p.contrastTextColor }}>
              Accuracy by Skill
            </h2>
            {selectedAccuracy.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.9rem', color: p.contrastTextColor, opacity: 0.85 }}>
                No skill data recorded for this student.
              </p>
            ) : (
              <>
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
                    {selectedAccuracy.map((a) => (
                      <li
                        key={a.skill}
                        style={row(selectedWeakSkillSet.has(a.skill) ? p.clearAnswerButtonColor : p.contrastTextColor)}
                      >
                        <span>{a.skill}</span>
                        <span>
                          {a.correct}/{a.attempts} ({Math.round(a.accuracy * 100)}%)
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              </>
            )}
          </div>

          <div style={card}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.75rem', color: p.contrastTextColor }}>
              Weak Topics (below {Math.round(WEAK_TOPIC_THRESHOLD * 100)}%)
            </h2>
            {selectedWeakTopics.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.9rem', color: p.contrastTextColor, opacity: 0.85 }}>
                No weak topics — every skill is at or above {Math.round(WEAK_TOPIC_THRESHOLD * 100)}% for this student.
              </p>
            ) : (
              <ul style={rowList}>
                {selectedWeakTopics.map((w) => (
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
            {selectedTiming.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.9rem', color: p.contrastTextColor, opacity: 0.85 }}>
                No timing data recorded for this student.
              </p>
            ) : (
              <>
                <SkillBarChart
                  data={timingChartData}
                  profile={p}
                  axisFormatter={(v) => `${v}s`}
                  highlightedWord="weak"
                />
                <details>
                  <summary style={detailsSummary}>View as table</summary>
                  <ul style={{ ...rowList, marginTop: '0.5rem' }}>
                    {selectedTiming.map((t) => (
                      <li key={t.skill} style={row(p.contrastTextColor)}>
                        <span>{t.skill}</span>
                        <span>
                          {t.averageTimeTakenInSeconds.toFixed(1)}s avg ({t.attempts} attempt{t.attempts === 1 ? '' : 's'})
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
