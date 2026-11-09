'use client';

import type { CSSProperties, ReactNode } from 'react';
import type { DashboardTheme } from '@/lib/teacherDashboardThemes';
import Icon, { type IconName } from './Icons';
import styles from './TeacherPortal.module.css';

/**
 * Small building blocks shared across the teacher portal. Inline styles from
 * the active DashboardTheme, matching the rest of the portal's convention.
 */

export const numeric: CSSProperties = { fontVariantNumeric: 'tabular-nums' };

/** The CSS variables TeacherPortal.module.css reads (focus ring, hover halo, table borders). */
export function themeVars(t: DashboardTheme): CSSProperties {
  return {
    '--tp-focus': t.highlight,
    '--tp-hover': t.accentSoft,
    '--tp-border': t.border,
  } as CSSProperties;
}

export function DashboardCard({
  theme: t,
  title,
  subtitle,
  action,
  id,
  children,
  style,
}: {
  theme: DashboardTheme;
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  id?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      aria-label={headingId ? undefined : title}
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        padding: 24,
        minWidth: 0,
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div style={{ minWidth: 0, flex: '1 1 200px' }}>
          <h2 id={headingId} style={{ margin: 0, fontSize: 17, fontWeight: 600, color: t.text }}>
            {title}
          </h2>
          {subtitle && <p style={{ margin: '2px 0 0', fontSize: 13, color: t.textMuted }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** A small panel inside a card (student detail sections). */
export function Panel({
  theme: t,
  title,
  icon,
  iconColor,
  action,
  children,
  style,
}: {
  theme: DashboardTheme;
  title: string;
  icon: IconName;
  iconColor?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={{ border: `1px solid ${t.border}`, borderRadius: 10, padding: 18, minWidth: 0, ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name={icon} size={16} color={iconColor ?? t.accentInk} />
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: t.text }}>{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Badge({
  theme: t,
  tone,
  children,
}: {
  theme: DashboardTheme;
  tone: 'accent' | 'warning' | 'neutral' | 'brand';
  children: ReactNode;
}) {
  const colors = {
    accent: { bg: t.accentSoft, fg: t.accentInk },
    warning: { bg: t.warningSoft, fg: t.warningText },
    neutral: { bg: t.surfaceAlt, fg: t.textMuted },
    brand: { bg: t.brand, fg: t.onBrand },
  }[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: 24,
        padding: '0 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        background: colors.bg,
        color: colors.fg,
        border: tone === 'neutral' ? `1px solid ${t.border}` : 'none',
      }}
    >
      {children}
    </span>
  );
}

export function SegmentedControl<V extends string>({
  theme: t,
  label,
  options,
  value,
  onChange,
}: {
  theme: DashboardTheme;
  label: string;
  options: { value: V; label: string }[];
  value: V;
  onChange: (value: V) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      style={{ display: 'inline-flex', padding: 3, borderRadius: 9, background: t.surfaceAlt, border: `1px solid ${t.border}`, gap: 2 }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            style={{
              minHeight: 36,
              padding: '0 12px',
              border: 0,
              borderRadius: 7,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: active ? 600 : 500,
              background: active ? t.surface : 'transparent',
              color: active ? t.text : t.textMuted,
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.12)' : 'none',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export interface StackedSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

/** One horizontal bar split into proportional segments, with an accessible text summary. */
export function StackedBar({ segments, height = 12 }: { segments: StackedSegment[]; height?: number }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const summary = segments.map((s) => `${s.label}: ${s.value}`).join(', ');
  return (
    <div
      role="img"
      aria-label={summary}
      style={{ display: 'flex', gap: 2, height, borderRadius: 999, overflow: 'hidden', background: total ? 'transparent' : 'rgba(0,0,0,0.06)' }}
    >
      {total > 0 &&
        segments
          .filter((s) => s.value > 0)
          .map((s) => <div key={s.key} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} />)}
    </div>
  );
}

export function Swatch({ color, line = false }: { color: string; line?: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={
        line
          ? { width: 2, height: 12, background: color, opacity: 0.35, flex: 'none' }
          : { width: 10, height: 10, borderRadius: 3, background: color, flex: 'none', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)' }
      }
    />
  );
}

export function SimpleBar({ theme: t, fraction, color }: { theme: DashboardTheme; fraction: number; color?: string }) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  return (
    <div aria-hidden="true" style={{ height: 8, borderRadius: 999, background: t.track }}>
      <div
        style={{
          height: 8,
          width: `${pct}%`,
          minWidth: pct > 0 ? 6 : 0,
          borderRadius: 999,
          background: color ?? t.accentInk,
        }}
      />
    </div>
  );
}

export { styles as portalStyles };
