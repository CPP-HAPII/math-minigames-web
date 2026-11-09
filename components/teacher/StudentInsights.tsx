'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { DashboardTheme } from '@/lib/teacherDashboardThemes';
import type { QuestionAttemptRow } from '@/lib/services/analyticsDataService';
import { plural, summarizeStudent } from '@/lib/teacherPortal';
import Icon from './Icons';
import StudentDetail from './StudentDetail';
import { Badge, DashboardCard, portalStyles } from './ui';

const PREVIEW_TILES = [
  { title: 'Student accuracy', caption: 'Performance by skill' },
  { title: 'Weak topics', caption: 'Skills below the threshold' },
  { title: 'Timing', caption: 'Time spent on questions' },
  { title: 'Assist-tier breakdown', caption: 'Support by assist tier' },
  { title: 'Interaction usage', caption: 'Individual assist events' },
];

/**
 * Student picker + per-student detail. The selected student lives in the URL
 * (?student=123) so a view can be shared or bookmarked and the back button
 * works. Uses useSearchParams, so the parent renders it inside <Suspense>.
 */
export default function StudentInsights({
  theme: t,
  rows,
  studentIds,
  classAccuracy,
  threshold,
}: {
  theme: DashboardTheme;
  /** Class rows (test accounts already removed). */
  rows: QuestionAttemptRow[];
  /** Students shown in the picker. */
  studentIds: string[];
  classAccuracy: number;
  threshold: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');

  const requested = searchParams.get('student');
  const selectedId = requested && rows.some((r) => r.userId === requested) ? requested : null;

  const selected = useMemo(
    () => (selectedId ? summarizeStudent(rows, selectedId, threshold) : null),
    [rows, selectedId, threshold],
  );

  function select(id: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set('student', id);
    else params.delete('student');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const q = query.trim().toLowerCase();
  const visibleIds = q ? studentIds.filter((id) => id.toLowerCase().includes(q)) : studentIds;

  return (
    <DashboardCard
      theme={t}
      id="students"
      title="Student insights"
      action={
        selectedId ? (
          <Badge theme={t} tone="brand">
            Viewing {selectedId}
          </Badge>
        ) : (
          <Badge theme={t} tone="accent">
            No student selected
          </Badge>
        )
      }
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '0 1 280px' }}>
          <label htmlFor="student-search" style={{ fontSize: 12, fontWeight: 600, color: t.text }}>
            Find a student
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: 14, display: 'flex' }}>
              <Icon name="search" size={16} color={t.textMuted} strokeWidth={2} />
            </span>
            <input
              id="student-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by student ID"
              autoComplete="off"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                minHeight: 44,
                padding: '0 12px 0 36px',
                border: `1px solid ${t.borderStrong}`,
                borderRadius: 8,
                background: t.surface,
                color: t.text,
                fontSize: 14,
              }}
            />
          </div>
        </div>
        <span style={{ fontSize: 13, color: t.textMuted, paddingBottom: 12 }}>{plural(studentIds.length, 'student')}</span>
      </div>

      <div role="group" aria-label="Students" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
        {visibleIds.map((id) => {
          const active = id === selectedId;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => select(active ? null : id)}
              className={portalStyles.interactive}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                minHeight: 44,
                padding: '0 16px',
                borderRadius: 8,
                border: `1px solid ${active ? t.brand : t.borderStrong}`,
                background: active ? t.brand : t.surface,
                color: active ? t.onBrand : t.accentInk,
                fontSize: 14,
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {id}
            </button>
          );
        })}
        {visibleIds.length === 0 && (
          <p style={{ margin: 0, padding: '12px 0', fontSize: 14, color: t.textMuted }}>
            {q ? `No students match “${query.trim()}”.` : 'No students to show.'}
          </p>
        )}
      </div>

      {selected ? (
        <StudentDetail theme={t} student={selected} classAccuracy={classAccuracy} threshold={threshold} onClear={() => select(null)} />
      ) : (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px', borderRadius: 12, background: t.accentSoft }}>
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                flex: 'none',
                background: t.surface,
                color: t.accentInk,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="userSearch" size={20} />
            </span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: t.text }}>A closer look starts with a student</div>
              <div style={{ fontSize: 13, color: t.text, opacity: 0.8 }}>
                Select an ID above to see accuracy, weak topics, timing, assist-tier breakdown, and interaction usage.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
            {PREVIEW_TILES.map((tile) => (
              <div key={tile.title} style={{ flex: '1 1 180px', border: `1px dashed ${t.borderStrong}`, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{tile.title}</div>
                <div aria-hidden="true" style={{ fontSize: 22, color: t.textMuted, margin: '4px 0' }}>
                  —
                </div>
                <div style={{ fontSize: 12, color: t.textMuted }}>{tile.caption}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardCard>
  );
}
