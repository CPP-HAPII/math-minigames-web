'use client';

import type { DashboardTheme } from '@/lib/teacherDashboardThemes';
import { formatSeconds, interactionLabel, plural, skillLabel, toPercent, type StudentSummary } from '@/lib/teacherPortal';
import Icon, { interactionIcon } from './Icons';
import MetricBarList, { type MetricBarItem } from './MetricBarList';
import { Badge, Panel, SimpleBar, StackedBar, Swatch, numeric } from './ui';
import { portalStyles } from './ui';

function MiniStat({ theme: t, label, value, caption, tone }: { theme: DashboardTheme; label: string; value: string; caption: string; tone?: 'warning' }) {
  return (
    <div style={{ flex: '1 1 120px', border: `1px solid ${t.border}`, borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: t.textMuted }}>{label}</div>
      <div style={{ ...numeric, fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', color: tone === 'warning' ? t.warningText : t.text }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: t.textMuted }}>{caption}</div>
    </div>
  );
}

/** Everything about one student — learning progress and assist usage — in one panel. */
export default function StudentDetail({
  theme: t,
  student: s,
  classAccuracy,
  threshold,
  onClear,
}: {
  theme: DashboardTheme;
  student: StudentSummary;
  classAccuracy: number;
  threshold: number;
  onClear: () => void;
}) {
  const thresholdPct = toPercent(threshold);
  const accuracyBelow = s.accuracy < threshold;
  const skillItems: MetricBarItem[] = [...s.skillAccuracy]
    .sort((a, b) => skillLabel(a.skill).localeCompare(skillLabel(b.skill)))
    .map((a) => ({
    key: a.skill,
    label: skillLabel(a.skill),
    value: toPercent(a.accuracy),
    valueLabel: `${toPercent(a.accuracy)}%`,
    detail: `${a.correct} of ${a.attempts} correct`,
    tableDetail: `${a.correct}/${a.attempts}`,
    warning: a.accuracy < threshold,
  }));
  const tierColors = [t.scale[0], t.scale[1], t.scale[2], t.scale[3]];
  const tierSegments = s.tiers.map((tier, i) => ({ key: tier.key, label: tier.label, value: tier.count, color: tierColors[i] }));
  const maxInteraction = Math.max(1, ...s.interactions.map((i) => i.count));
  // 3-digit IDs fit in the avatar as-is; longer (test) IDs get their first two characters.
  const initials = s.userId.length <= 3 ? s.userId : s.userId.slice(0, 2).toUpperCase();

  return (
    <div style={{ marginTop: 24, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden' }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          padding: '18px 20px',
          background: t.surfaceAlt,
          borderBottom: `1px solid ${t.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <span
            aria-hidden="true"
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              flex: 'none',
              background: t.brand,
              color: t.highlight,
              fontSize: 14,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {initials}
          </span>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em', color: t.text, overflowWrap: 'anywhere' }}>
              Student {s.userId}
            </h3>
            <div style={{ fontSize: 13, color: t.textMuted }}>
              {plural(s.attempts, 'attempt')} across {plural(s.skillAccuracy.length, 'skill')}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={onClear}
            className={portalStyles.interactive}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              minHeight: 44,
              padding: '0 12px',
              borderRadius: 8,
              border: `1px solid ${t.borderStrong}`,
              background: t.surface,
              color: t.text,
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            <Icon name="x" size={14} strokeWidth={2} />
            Clear
          </button>
        </div>
      </div>

      {s.attempts === 0 ? (
        <p style={{ margin: 0, padding: 20, fontSize: 14, color: t.textMuted }}>No question attempts recorded for this student.</p>
      ) : (
        <>
          {/* ── Key numbers ────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: '20px 20px 0' }}>
            <MiniStat
              theme={t}
              label="Accuracy"
              value={`${toPercent(s.accuracy)}%`}
              caption={`Class ${toPercent(classAccuracy)}%`}
              tone={accuracyBelow ? 'warning' : undefined}
            />
            <MiniStat theme={t} label="Attempts" value={String(s.attempts)} caption={`${s.correct} correct`} />
            <MiniStat theme={t} label="Avg. time per question" value={formatSeconds(s.averageSeconds)} caption="Across all attempts" />
            <MiniStat
              theme={t}
              label="Assist events"
              value={String(s.assistEvents)}
              caption={`${(s.assistEvents / s.attempts).toFixed(1)} per attempt`}
            />
          </div>

          {/* ── Learning progress ──────────────────────────────────────── */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, padding: 20 }}>
            <Panel theme={t} title="Accuracy by skill" icon="bars" style={{ flex: '999 1 480px' }}>
              {skillItems.length === 0 ? (
                <p style={{ margin: 0, fontSize: 14, color: t.textMuted }}>No skill data recorded for this student.</p>
              ) : (
                <MetricBarList
                  theme={t}
                  items={skillItems}
                  max={100}
                  markerAt={thresholdPct}
                  labelHeader="Learning skill"
                  valueHeader="Accuracy"
                  tableDetailHeader="Correct"
                  compact
                />
              )}
            </Panel>

            <div style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <Panel
                theme={t}
                title="Weak topics"
                icon="flag"
                iconColor={t.warningText}
                action={
                  <Badge theme={t} tone="warning">
                    Below {thresholdPct}%
                  </Badge>
                }
              >
                {s.weakTopics.length === 0 ? (
                  <p style={{ margin: 0, paddingTop: 10, borderTop: `1px solid ${t.border}`, fontSize: 13, color: t.textMuted }}>
                    Every practiced skill is at or above {thresholdPct}%.
                  </p>
                ) : (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {s.weakTopics.map((w) => (
                      <li
                        key={w.skill}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 0',
                          borderTop: `1px solid ${t.border}`,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: t.text }}>{skillLabel(w.skill)}</div>
                          <div style={{ fontSize: 12, color: t.textMuted }}>
                            {w.correct} of {w.attempts} correct
                          </div>
                        </div>
                        <span style={{ ...numeric, fontSize: 16, fontWeight: 600, color: t.warningText }}>{toPercent(w.accuracy)}%</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel theme={t} title="Timing" icon="clock">
                <dl style={{ margin: 0 }}>
                  {[
                    { label: 'Fastest skill', timing: s.fastest },
                    { label: 'Slowest skill', timing: s.slowest },
                  ]
                    .filter((row) => row.timing)
                    .map((row) => (
                      <div
                        key={row.label}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 0',
                          borderTop: `1px solid ${t.border}`,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <dt style={{ fontSize: 12, color: t.textMuted }}>{row.label}</dt>
                          <dd style={{ margin: 0, fontSize: 14, fontWeight: 500, color: t.text }}>{skillLabel(row.timing!.skill)}</dd>
                        </div>
                        <span style={{ ...numeric, fontSize: 15, fontWeight: 600, color: t.text }}>
                          {formatSeconds(row.timing!.averageTimeTakenInSeconds)}
                        </span>
                      </div>
                    ))}
                </dl>
                {s.timing.length > 2 && (
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ fontSize: 13, fontWeight: 500, color: t.accentInk, cursor: 'pointer', width: 'fit-content' }}>
                      All skills
                    </summary>
                    <table className={portalStyles.table} style={{ marginTop: 8, color: t.text }}>
                      <thead>
                        <tr style={{ color: t.textMuted }}>
                          <th scope="col">Skill</th>
                          <th scope="col">Attempts</th>
                          <th scope="col">Avg. time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.timing.map((row) => (
                          <tr key={row.skill}>
                            <th scope="row" style={{ fontWeight: 500 }}>
                              {skillLabel(row.skill)}
                            </th>
                            <td>{row.attempts}</td>
                            <td>{formatSeconds(row.averageTimeTakenInSeconds)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                )}
              </Panel>
            </div>
          </div>

          {/* ── Assist usage ───────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, padding: '0 20px 20px' }}>
            <Panel theme={t} title="Assist-tier breakdown" icon="layers" style={{ flex: '1 1 380px' }}>
              <StackedBar segments={tierSegments} height={14} />
              <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {s.tiers.map((tier, i) => (
                  <li
                    key={tier.key}
                    style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 40px 48px', gap: 8, alignItems: 'center', fontSize: 14, color: t.text }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <Swatch color={tierColors[i]} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block' }}>{tier.label}</span>
                        <span style={{ display: 'block', color: t.textMuted, fontSize: 12 }}>{tier.detail}</span>
                      </span>
                    </span>
                    <span style={{ ...numeric, textAlign: 'right', fontWeight: 600 }}>{tier.count}</span>
                    <span style={{ ...numeric, textAlign: 'right', color: t.textMuted }}>
                      {s.attempts ? Math.round((tier.count / s.attempts) * 100) : 0}%
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel theme={t} title="Interaction usage" icon="languages" style={{ flex: '1 1 380px' }}>
              {s.interactions.length === 0 ? (
                <p style={{ margin: 0, fontSize: 14, color: t.textMuted }}>No assist interactions recorded for this student.</p>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {s.interactions.map((i) => (
                    <li key={i.interaction}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 14, marginBottom: 6, color: t.text }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <Icon name={interactionIcon(i.interaction)} size={16} color={t.textMuted} />
                          {interactionLabel(i.interaction)}
                        </span>
                        <span style={{ ...numeric, fontWeight: 600 }}>{i.count}</span>
                      </div>
                      <SimpleBar theme={t} fraction={i.count / maxInteraction} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
