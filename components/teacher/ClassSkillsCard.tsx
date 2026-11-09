'use client';

import { useState } from 'react';
import type { DashboardTheme } from '@/lib/teacherDashboardThemes';
import type { SkillAccuracy, SkillTiming } from '@/lib/services/analyticsService';
import { formatSeconds, plural, skillLabel, toPercent } from '@/lib/teacherPortal';
import MetricBarList, { type MetricBarItem } from './MetricBarList';
import { DashboardCard, SegmentedControl, Swatch } from './ui';

type Metric = 'accuracy' | 'time';
type Sort = 'name' | 'low' | 'high';

export function sortItems(items: MetricBarItem[], sort: Sort): MetricBarItem[] {
  const sorted = [...items];
  if (sort === 'name') sorted.sort((a, b) => a.label.localeCompare(b.label));
  if (sort === 'low') sorted.sort((a, b) => a.value - b.value || a.label.localeCompare(b.label));
  if (sort === 'high') sorted.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  return sorted;
}

export function accuracyItems(accuracy: SkillAccuracy[], threshold: number): MetricBarItem[] {
  return accuracy.map((a) => {
    const warning = a.accuracy < threshold;
    return {
      key: a.skill,
      label: skillLabel(a.skill),
      value: toPercent(a.accuracy),
      valueLabel: `${toPercent(a.accuracy)}%`,
      tableDetail: `${a.correct}/${a.attempts}`,
      warning,
    };
  });
}

/** Class-wide accuracy and average time per skill, switchable in one card. */
export default function ClassSkillsCard({
  theme: t,
  accuracy,
  timing,
  threshold,
}: {
  theme: DashboardTheme;
  accuracy: SkillAccuracy[];
  timing: SkillTiming[];
  threshold: number;
}) {
  const [metric, setMetric] = useState<Metric>('accuracy');
  const [sort, setSort] = useState<Sort>('name');
  const thresholdPct = toPercent(threshold);

  const timeItems: MetricBarItem[] = timing.map((s) => ({
    key: s.skill,
    label: skillLabel(s.skill),
    value: s.averageTimeTakenInSeconds,
    valueLabel: formatSeconds(s.averageTimeTakenInSeconds),
    tableDetail: plural(s.attempts, 'attempt'),
  }));
  const maxTime = Math.max(1, ...timing.map((s) => s.averageTimeTakenInSeconds));
  const timeMax = Math.ceil(maxTime / 10) * 10;

  const isAccuracy = metric === 'accuracy';
  const items = sortItems(isAccuracy ? accuracyItems(accuracy, threshold) : timeItems, sort);

  return (
    <DashboardCard
      theme={t}
      id="skills"
      title={isAccuracy ? 'Accuracy by skill' : 'Average time by skill'}
      action={
        <SegmentedControl
          theme={t}
          label="Metric"
          value={metric}
          onChange={setMetric}
          options={[
            { value: 'accuracy', label: 'Accuracy' },
            { value: 'time', label: 'Avg. time' },
          ]}
        />
      }
      style={{ flex: '999 1 640px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: t.textMuted }}>Sort</span>
        <SegmentedControl
          theme={t}
          label="Sort skills"
          value={sort}
          onChange={setSort}
          options={[
            { value: 'name', label: 'A–Z' },
            { value: 'low', label: isAccuracy ? 'Lowest first' : 'Fastest first' },
            { value: 'high', label: isAccuracy ? 'Highest first' : 'Slowest first' },
          ]}
        />
      </div>

      {items.length === 0 ? (
        <p style={{ margin: 0, fontSize: 14, color: t.textMuted }}>No skill data recorded yet.</p>
      ) : isAccuracy ? (
        <MetricBarList
          theme={t}
          items={items}
          max={100}
          markerAt={thresholdPct}
          axisTicks={['0%', '25%', '50%', '75%', '100%']}
          labelHeader="Learning skill"
          valueHeader="Accuracy"
          tableDetailHeader="Correct"
        />
      ) : (
        <MetricBarList
          theme={t}
          items={items}
          max={timeMax}
          axisTicks={[0, 0.25, 0.5, 0.75, 1].map((f) => formatSeconds(timeMax * f).replace('.0s', 's'))}
          labelHeader="Learning skill"
          valueHeader="Avg. time"
          tableDetailHeader="Attempts"
        />
      )}

      {isAccuracy && items.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px 20px',
            marginTop: 16,
            paddingTop: 14,
            borderTop: `1px solid ${t.border}`,
            fontSize: 12,
            color: t.textMuted,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Swatch color={t.accent} />
            {thresholdPct}% and above
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Swatch color={t.warningFill} />
            Below {thresholdPct}% · needs attention
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Swatch color={t.text} line />
            {thresholdPct}% threshold
          </span>
        </div>
      )}
    </DashboardCard>
  );
}
