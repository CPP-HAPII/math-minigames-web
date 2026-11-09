'use client';

import { Suspense, useMemo } from 'react';
import { useDashboardTheme } from '@/lib/hooks/useDashboardTheme';
import { useClassAnalytics } from '@/lib/hooks/useClassAnalytics';
import type { DashboardTheme } from '@/lib/teacherDashboardThemes';
import { STRONG_SKILL_THRESHOLD, WEAK_TOPIC_THRESHOLD, excludeTestAccounts, summarizeClass } from '@/lib/teacherPortal';
import ClassSkillsCard from './ClassSkillsCard';
import { AssistInteractionsCard, SkillHealthCard } from './ClassSidePanels';
import Icon from './Icons';
import StudentInsights from './StudentInsights';
import { portalStyles } from './ui';

function StatusCard({ theme: t, children }: { theme: DashboardTheme; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        padding: '40px 24px',
        textAlign: 'center',
        color: t.text,
      }}
    >
      {children}
    </div>
  );
}

function LoadingState({ theme: t }: { theme: DashboardTheme }) {
  const block = (h: number, flex: string) => (
    <div className={portalStyles.skeleton} style={{ flex, height: h, borderRadius: 12, background: t.surface, border: `1px solid ${t.border}` }} />
  );
  return (
    <div role="status" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <span className={portalStyles.srOnly}>Loading class data…</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
        {block(560, '999 1 640px')}
        {block(560, '1 1 320px')}
      </div>
    </div>
  );
}

/** The whole teacher portal on one page: class summary, skills, assist usage and per-student insights. */
export default function TeacherPortalDashboard() {
  const t = useDashboardTheme();
  const { status, rows: fetchedRows, errorMessage, retry } = useClassAnalytics();
  const threshold = WEAK_TOPIC_THRESHOLD;

  // Script/smoke-test writers (non-3-digit IDs) never appear anywhere in the portal.
  const rows = useMemo(() => excludeTestAccounts(fetchedRows), [fetchedRows]);
  const summary = useMemo(() => summarizeClass(rows, threshold), [rows, threshold]);

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px 48px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {status === 'loading' && <LoadingState theme={t} />}

      {status === 'error' && (
        <StatusCard theme={t}>
          <div style={{ display: 'inline-flex', color: t.warningText }}>
            <Icon name="alert" size={28} />
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 16, fontWeight: 600 }}>Couldn&rsquo;t load class data.</p>
          {errorMessage && <p style={{ margin: '6px 0 0', fontSize: 13, color: t.textMuted }}>{errorMessage}</p>}
          <button
            type="button"
            onClick={retry}
            className={portalStyles.interactive}
            style={{
              marginTop: 16,
              minHeight: 44,
              padding: '0 20px',
              borderRadius: 8,
              border: 0,
              background: t.brand,
              color: t.onBrand,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Retry
          </button>
        </StatusCard>
      )}

      {status === 'loaded' && rows.length === 0 && (
        <StatusCard theme={t}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>No data yet</p>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: t.textMuted }}>No students have completed any questions yet.</p>
        </StatusCard>
      )}

      {status === 'loaded' && rows.length > 0 && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
            <ClassSkillsCard theme={t} accuracy={summary.skillAccuracy} timing={summary.timing} threshold={threshold} />
            <div style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <AssistInteractionsCard theme={t} interactions={summary.interactions} />
              <SkillHealthCard theme={t} health={summary.health} threshold={threshold} strongThreshold={STRONG_SKILL_THRESHOLD} />
            </div>
          </div>

          <Suspense fallback={null}>
            <StudentInsights
              theme={t}
              rows={rows}
              studentIds={summary.studentIds}
              classAccuracy={summary.accuracy}
              threshold={threshold}
            />
          </Suspense>
        </>
      )}
    </div>
  );
}
