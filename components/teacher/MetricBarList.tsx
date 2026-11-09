'use client';

import type { DashboardTheme } from '@/lib/teacherDashboardThemes';
import styles from './TeacherPortal.module.css';

/** The old chart's ⚠ marker: gold triangle with a dark "!" so it stays visible on white cards. */
function WarningMark({ fill }: { fill: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ flex: 'none', marginTop: 3 }}>
      <path d="M12 2.5 1.5 21h21z" fill={fill} stroke="#7A5200" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 9.5v5" stroke="#3D2900" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="17.6" r="1.25" fill="#3D2900" />
    </svg>
  );
}

export interface MetricBarItem {
  key: string;
  label: string;
  /** Raw value on the list's scale (e.g. 0–100 for percent, seconds for timing). */
  value: number;
  /** Formatted value at the end of the row, e.g. "82%" or "12.3s". */
  valueLabel: string;
  /** Optional muted line under the label, e.g. "2 of 3 correct". */
  detail?: string;
  /** Extra column shown only in the table view, e.g. "9/11". */
  tableDetail?: string;
  /** Status treatment: gold bar + ⚠ marker next to the label, as in the original portal (never color alone). */
  warning?: boolean;
}

/**
 * Horizontal bar list rendered as plain HTML rows: real text for labels and
 * values (screen readers and narrow screens get readable rows, no SVG tick
 * wrapping), with an optional threshold marker and a "View as table" fallback.
 */
export default function MetricBarList({
  theme: t,
  items,
  max,
  markerAt,
  axisTicks,
  labelHeader,
  valueHeader,
  tableDetailHeader,
  compact = false,
}: {
  theme: DashboardTheme;
  items: MetricBarItem[];
  /** Value that fills the whole track. */
  max: number;
  /** Draws a thin threshold line at this value on every track. */
  markerAt?: number;
  /** Axis labels shown above the tracks (evenly spaced, first to last). */
  axisTicks?: string[];
  labelHeader: string;
  valueHeader: string;
  tableDetailHeader?: string;
  compact?: boolean;
}) {
  const safeMax = max > 0 ? max : 1;
  const markerPct = markerAt === undefined ? null : Math.min(100, (markerAt / safeMax) * 100);

  return (
    <div>
      {axisTicks && (
        <div
          className={styles.barAxis}
          aria-hidden="true"
          style={{
            paddingBottom: 8,
            borderBottom: `1px solid ${t.border}`,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: t.textMuted,
          }}
        >
          <span className={styles.barLabel}>{labelHeader}</span>
          <span
            className={styles.barTrack}
            style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 500, letterSpacing: 0, textTransform: 'none', fontVariantNumeric: 'tabular-nums' }}
          >
            {axisTicks.map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
          </span>
          <span className={styles.barValue}>{valueHeader}</span>
        </div>
      )}

      <ul style={{ listStyle: 'none', margin: 0, padding: axisTicks ? '6px 0 0' : 0 }}>
        {items.map((item) => {
          const pct = Math.max(0, Math.min(100, (item.value / safeMax) * 100));
          return (
            <li key={item.key} className={styles.barRow} style={compact ? { padding: '5px 0' } : undefined}>
              <div className={styles.barLabel}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 14, fontWeight: 500, color: t.text }}>
                  <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                    {item.label}
                    {item.warning && <span className={styles.srOnly}> (needs attention)</span>}
                  </span>
                  {item.warning && <WarningMark fill={t.warningFill} />}
                </div>
                {item.detail && <div style={{ fontSize: 12, color: t.textMuted }}>{item.detail}</div>}
              </div>
              <div className={styles.barTrack} aria-hidden="true" style={{ position: 'relative', height: compact ? 8 : 10, borderRadius: 999, background: t.track }}>
                <div
                  style={{
                    position: 'absolute',
                    inset: '0 auto 0 0',
                    width: `${pct}%`,
                    minWidth: pct > 0 ? 4 : 0,
                    borderRadius: 999,
                    background: item.warning ? t.warningFill : t.accent,
                  }}
                />
                {markerPct !== null && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -4,
                      bottom: -4,
                      left: `calc(${markerPct}% - 1px)`,
                      width: 2,
                      borderRadius: 1,
                      background: t.text,
                      opacity: 0.3,
                    }}
                  />
                )}
              </div>
              <div className={styles.barValue} style={{ fontSize: 13, fontWeight: 600, color: t.text, fontVariantNumeric: 'tabular-nums' }}>
                {item.valueLabel}
              </div>
            </li>
          );
        })}
      </ul>

      <details style={{ marginTop: 12 }}>
        <summary style={{ fontSize: 13, fontWeight: 500, color: t.accentInk, cursor: 'pointer', width: 'fit-content' }}>
          View as table
        </summary>
        <table className={styles.table} style={{ marginTop: 8, color: t.text }}>
          <thead>
            <tr style={{ color: t.textMuted }}>
              <th scope="col">{labelHeader}</th>
              {tableDetailHeader && <th scope="col">{tableDetailHeader}</th>}
              <th scope="col">{valueHeader}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.key} style={{ color: t.text }}>
                <th scope="row" style={{ fontWeight: 500 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 6 }}>
                    {item.label}
                    {item.warning && <WarningMark fill={t.warningFill} />}
                  </span>
                  {item.warning && <span className={styles.srOnly}> (needs attention)</span>}
                </th>
                {tableDetailHeader && <td>{item.tableDetail ?? ''}</td>}
                <td>{item.valueLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
