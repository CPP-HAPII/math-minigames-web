'use client';

import { useEffect, useState } from 'react';
import { useTeacherDashboardThemeStore, selectActiveDashboardTheme } from '@/lib/stores/teacherDashboardThemeStore';
import { useHydrated } from '@/lib/hooks/useHydrated';
import { teacherDashboardThemes } from '@/lib/teacherDashboardThemes';
import type { AssistLevel } from '@/lib/types';
import { fetchAllQuestionRows, type QuestionAttemptRow } from '@/lib/services/analyticsDataService';
import { computeAssistUsageByStudent, computeInteractionTypeCounts } from '@/lib/services/analyticsService';
import SkillBarChart, { type SkillBarDatum } from '@/components/teacher/charts/SkillBarChart';

type Status = 'loading' | 'loaded' | 'error';

/** Plain labels — matches app/home/page.tsx's ASSIST_LEVELS UI copy exactly (no "Full/Half/Low Assist" parenthetical, which never appears in user-facing text anywhere in this app). */
const TIER_LABELS: { key: AssistLevel; label: string }[] = [
  { key: 'novice', label: 'Novice' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced', label: 'Advanced' },
];

export default function AssistUsagePage() {
  const profile = useTeacherDashboardThemeStore(selectActiveDashboardTheme);
  const hydrated = useHydrated();
  const p = hydrated ? profile : teacherDashboardThemes[0];

  // Data fetch — identical pattern to Overview/Student Detail: a single
  // `result` value (null while in flight), a `cancelled` guard, setState only
  // inside the async .then()/.catch() callbacks. One fetch serves both the
  // class-wide ranking and the per-student picker/breakdown below.
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

  // ── Styles (matches Overview / Student Detail's card/row convention) ────
  const card: React.CSSProperties = {
    backgroundColor: p.cardBackground,
    border: `1px solid ${p.cardBorder}`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
    borderRadius: '1rem',
    padding: '1.25rem 1.75rem',
    marginBottom: '1rem',
    maxWidth: '760px',
  };

  const actionButton: React.CSSProperties = {
    backgroundColor: p.accent,
    color: p.accentText,
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

  const row = (color: string, weight = 700): React.CSSProperties => ({
    fontSize: '0.9rem',
    color,
    fontWeight: weight,
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
  });

  // Student-picker button — same pattern as Student Detail's studentBtn / home/page.tsx's selectorBtn.
  const studentBtn = (active: boolean): React.CSSProperties => ({
    backgroundColor: active ? p.accent : p.pickerInactiveBackground,
    color: active ? p.accentText : p.text,
    border: `1.5px solid ${active ? 'transparent' : p.navBorder}`,
    borderRadius: '0.5rem',
    padding: '0.5rem 1.1rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '0.95rem',
    transition: 'background-color 0.15s',
  });

  // ── Loading ──────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div style={{ ...card, textAlign: 'center' }}>
        <p style={{ margin: 0, color: p.text }}>Loading assist-usage data…</p>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div style={{ ...card, textAlign: 'center' }}>
        <p style={{ margin: 0, fontWeight: 700, color: p.text }}>Couldn&rsquo;t load assist-usage data.</p>
        {errorMessage && (
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', opacity: 0.8, color: p.text }}>
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
        <p style={{ margin: 0, fontWeight: 700, color: p.text }}>No data yet</p>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', opacity: 0.85, color: p.text }}>
          No students have completed any questions yet.
        </p>
      </div>
    );
  }

  // ── Loaded ───────────────────────────────────────────────────────────────
  const classInteractionCounts = computeInteractionTypeCounts(rows);
  const studentIds = [...new Set(rows.map((r) => r.userId))].sort();
  const assistUsageByStudent = computeAssistUsageByStudent(rows);
  const selectedUsage = selectedUserId ? assistUsageByStudent.find((u) => u.userId === selectedUserId) ?? null : null;

  // interactionTypeCounts is a Record (unordered); rank it the same way
  // computeInteractionTypeCounts already ranks the class-wide list.
  const selectedInteractionCounts = selectedUsage
    ? Object.entries(selectedUsage.interactionTypeCounts)
        .map(([interaction, count]) => ({ interaction, count }))
        .sort((a, b) => b.count - a.count)
    : [];

  // count/total → SkillBarDatum. No status concept applies to counts here
  // (nothing is "weak"), so `highlighted` stays unset on every row.
  const toCountDatum = (label: string, count: number, total: number): SkillBarDatum => ({
    skill: label,
    value: count,
    valueLabel: `${count}`,
    detailLabel: `${count}/${total} question${total === 1 ? '' : 's'} (${total === 0 ? 0 : Math.round((count / total) * 100)}%)`,
  });

  const classInteractionChartData: SkillBarDatum[] = classInteractionCounts.map((ic) =>
    toCountDatum(ic.interaction, ic.count, rows.length),
  );

  const tierChartData: SkillBarDatum[] = [
    ...TIER_LABELS.map(({ key, label }) => toCountDatum(label, selectedUsage?.tierCounts[key] ?? 0, selectedUsage?.totalQuestions ?? 0)),
    toCountDatum('No assist used', selectedUsage?.noAssistCount ?? 0, selectedUsage?.totalQuestions ?? 0),
  ];

  const selectedInteractionChartData: SkillBarDatum[] = selectedUsage
    ? selectedInteractionCounts.map((ic) => toCountDatum(ic.interaction, ic.count, selectedUsage.totalQuestions))
    : [];

  const detailsSummary: React.CSSProperties = {
    fontSize: '0.8rem',
    color: p.text,
    opacity: 0.75,
    cursor: 'pointer',
    marginTop: '0.75rem',
  };

  return (
    <div>
      {/* ── Class-wide: most common interaction types ──────────────────── */}
      <div style={card}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.75rem', color: p.text }}>
          Most Common Interactions (Class-wide)
        </h2>
        {classInteractionCounts.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.9rem', color: p.text, opacity: 0.85 }}>
            No assist interactions recorded yet.
          </p>
        ) : (
          <>
            <SkillBarChart
              data={classInteractionChartData}
              profile={p}
              axisFormatter={(v) => `${Math.round(v)}`}
              highlightedWord=""
            />
            <details>
              <summary style={detailsSummary}>View as table</summary>
              <ul style={{ ...rowList, marginTop: '0.5rem' }}>
                {classInteractionCounts.map((ic) => (
                  <li key={ic.interaction} style={row(p.text)}>
                    <span>{ic.interaction}</span>
                    <span>{ic.count}</span>
                  </li>
                ))}
              </ul>
            </details>
          </>
        )}
      </div>

      {/* ── Per-student: tier breakdown + interaction tally ─────────────── */}
      <div style={card}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.75rem', color: p.text }}>
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
          <p style={{ margin: 0, fontSize: '0.9rem', color: p.text, opacity: 0.85 }}>
            Select a student above to view their assist-tier breakdown and interaction usage.
          </p>
        </div>
      ) : (
        <>
          <div style={card}>
            <p style={{ margin: 0, fontSize: '0.95rem', color: p.text }}>
              <strong>{selectedUserId}</strong> &middot; <strong>{selectedUsage?.totalQuestions ?? 0}</strong> question
              attempt{(selectedUsage?.totalQuestions ?? 0) === 1 ? '' : 's'} logged
            </p>
          </div>

          <div style={card}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.75rem', color: p.text }}>
              Assist-Tier Breakdown
            </h2>
            <SkillBarChart
              data={tierChartData}
              profile={p}
              axisFormatter={(v) => `${Math.round(v)}`}
              highlightedWord=""
            />
            <details>
              <summary style={detailsSummary}>View as table</summary>
              <ul style={{ ...rowList, marginTop: '0.5rem' }}>
                {TIER_LABELS.map(({ key, label }) => (
                  <li key={key} style={row(p.text)}>
                    <span>{label}</span>
                    <span>{selectedUsage?.tierCounts[key] ?? 0}</span>
                  </li>
                ))}
                <li style={row(p.text)}>
                  <span>No assist used</span>
                  <span>{selectedUsage?.noAssistCount ?? 0}</span>
                </li>
              </ul>
            </details>
          </div>

          <div style={card}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.75rem', color: p.text }}>
              Interaction Types Used
            </h2>
            {selectedInteractionCounts.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.9rem', color: p.text, opacity: 0.85 }}>
                No assist interactions recorded for this student.
              </p>
            ) : (
              <>
                <SkillBarChart
                  data={selectedInteractionChartData}
                  profile={p}
                  axisFormatter={(v) => `${Math.round(v)}`}
                  highlightedWord=""
                />
                <details>
                  <summary style={detailsSummary}>View as table</summary>
                  <ul style={{ ...rowList, marginTop: '0.5rem' }}>
                    {selectedInteractionCounts.map((ic) => (
                      <li key={ic.interaction} style={row(p.text)}>
                        <span>{ic.interaction}</span>
                        <span>{ic.count}</span>
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
