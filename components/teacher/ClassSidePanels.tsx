'use client';

import type { DashboardTheme } from '@/lib/teacherDashboardThemes';
import type { InteractionTypeCount } from '@/lib/services/analyticsService';
import { interactionLabel, toPercent, type SkillHealth } from '@/lib/teacherPortal';
import Icon, { interactionIcon } from './Icons';
import { DashboardCard, SimpleBar, StackedBar, Swatch, numeric } from './ui';

/** Assist Usage: class-wide ranking of assist interaction events. */
export function AssistInteractionsCard({
  theme: t,
  interactions,
}: {
  theme: DashboardTheme;
  interactions: InteractionTypeCount[];
}) {
  const max = Math.max(1, ...interactions.map((i) => i.count));
  return (
    <DashboardCard
      theme={t}
      id="assist"
      title="Assist Usage"
    >
      {interactions.length === 0 ? (
        <p style={{ margin: 0, fontSize: 14, color: t.textMuted }}>No assist interactions recorded yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {interactions.map((i) => (
            <li key={i.interaction}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, color: t.text }}>
                  <Icon name={interactionIcon(i.interaction)} size={16} color={t.textMuted} />
                  {interactionLabel(i.interaction)}
                </span>
                <span style={{ ...numeric, fontSize: 15, fontWeight: 600, color: t.text }}>{i.count}</span>
              </div>
              <SimpleBar theme={t} fraction={i.count / max} />
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}

/** Skill accuracy: how many skills are strong, on track, or below the weak-topic threshold. */
export function SkillHealthCard({
  theme: t,
  health,
  threshold,
  strongThreshold,
}: {
  theme: DashboardTheme;
  health: SkillHealth;
  threshold: number;
  strongThreshold: number;
}) {
  const total = health.strong + health.onTrack + health.weak;
  const rows = [
    { key: 'strong', label: `Strong · ${toPercent(strongThreshold)}% and above`, value: health.strong, color: t.accent },
    {
      key: 'onTrack',
      label: `On track · ${toPercent(threshold)}–${toPercent(strongThreshold) - 1}%`,
      value: health.onTrack,
      color: t.scale[1],
    },
    { key: 'weak', label: `Needs attention · below ${toPercent(threshold)}%`, value: health.weak, color: t.warningFill },
  ];
  return (
    <DashboardCard theme={t} id="health" title="Skill accuracy" subtitle={`${total} skills grouped by class accuracy`}>
      <StackedBar segments={rows} />
      <ul style={{ listStyle: 'none', margin: '16px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((r) => (
          <li key={r.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 14, color: t.text }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Swatch color={r.color} />
              {r.label}
            </span>
            <span style={{ ...numeric, fontWeight: 600, color: r.key === 'weak' && r.value > 0 ? t.warningText : t.text }}>
              {r.value}
            </span>
          </li>
        ))}
      </ul>
    </DashboardCard>
  );
}
