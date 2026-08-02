'use client';

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TooltipContentProps, YAxisTickContentProps } from 'recharts';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import type { ColorProfile } from '@/lib/themes';

export interface SkillBarDatum {
  skill: string;
  /** Raw numeric value driving bar length (e.g. accuracy 0–100, or seconds). */
  value: number;
  /** Formatted value shown at the bar tip / in the stat tile (e.g. "82%", "3.2s"). */
  valueLabel: string;
  /** Secondary detail shown in the tooltip / stat tile (e.g. "9/11 attempts"). */
  detailLabel: string;
  /** Flags this skill for the status (weak-topic) treatment — color + icon, never color alone. */
  highlighted?: boolean;
}

interface SkillBarChartProps {
  data: SkillBarDatum[];
  profile: ColorProfile;
  /** Formats an X-axis tick value (e.g. `(v) => \`${v}%\``). */
  axisFormatter: (value: number) => string;
  /** Fixed axis domain, e.g. [0, 100] for a percentage. Omit to auto-scale to the data with headroom. */
  domain?: [number, number];
  /** Word used next to the ⚠ icon for highlighted rows (tick label + tooltip) — e.g. "weak". */
  highlightedWord: string;
}

const ROW_HEIGHT = 40;
const CHART_TOP_MARGIN = 8;
const CHART_BOTTOM_MARGIN = 8;
const AVG_CHAR_PX = 6.4;
const MIN_AXIS_WIDTH = 90;
const MAX_AXIS_WIDTH = 190;
const WARNING_ICON = '⚠';

function wrapLabel(label: string, maxCharsPerLine: number, maxLines = 2): string[] {
  const words = label.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);

  if (lines.length > maxLines) {
    const truncated = lines.slice(0, maxLines);
    const last = truncated[maxLines - 1];
    truncated[maxLines - 1] = last.length > 3 ? `${last.slice(0, last.length - 3)}...` : last;
    return truncated;
  }
  return lines;
}

function SkillTick(
  props: YAxisTickContentProps,
  data: SkillBarDatum[],
  maxCharsPerLine: number,
  profile: ColorProfile,
) {
  const x = Number(props.x) || 0;
  const y = Number(props.y) || 0;
  const skill = String(props.payload?.value ?? '');
  const datum = data.find((d) => d.skill === skill);
  const lines = wrapLabel(skill, maxCharsPerLine);
  const lineHeight = 13;
  const startDy = -((lines.length - 1) * lineHeight) / 2 + 4;

  return (
    <g transform={`translate(${x},${y})`}>
      {datum?.highlighted && (
        <text x={-8} y={0} dy={startDy} textAnchor="end" fontSize={11} fill={profile.clearAnswerButtonColor}>
          {WARNING_ICON}
        </text>
      )}
      <text textAnchor="end" x={datum?.highlighted ? -20 : -8} fontSize={12} fill={profile.contrastTextColor}>
        {lines.map((line, i) => (
          <tspan key={i} x={datum?.highlighted ? -20 : -8} dy={i === 0 ? startDy : lineHeight}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

function ChartTooltip(
  { active, payload }: TooltipContentProps<ValueType, NameType>,
  profile: ColorProfile,
  highlightedWord: string,
) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload as SkillBarDatum;
  return (
    <div
      style={{
        backgroundColor: profile.backgroundColor,
        border: `1px solid ${profile.buttonColor}`,
        borderRadius: '0.5rem',
        padding: '0.5rem 0.75rem',
        maxWidth: '220px',
      }}
    >
      <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: profile.contrastTextColor }}>
        {item.valueLabel}
      </p>
      <p style={{ margin: '0.15rem 0 0', fontSize: '0.85rem', color: profile.contrastTextColor }}>
        {item.skill}
        {item.highlighted ? ` ${WARNING_ICON} ${highlightedWord}` : ''}
      </p>
      <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: profile.contrastTextColor, opacity: 0.75 }}>
        {item.detailLabel}
      </p>
    </div>
  );
}

/**
 * Horizontal bar chart for one metric per skill. Single-datum input renders as
 * a stat tile instead — a one-bar bar chart is never the right form (the value
 * is the whole story). Bars are always directly value-labeled: the theme's
 * button/status colors don't clear 3:1 contrast against the card surface in
 * every ColorProfile, so the label is the mandatory relief channel rather than
 * an optional flourish.
 */
export default function SkillBarChart({ data, profile: p, axisFormatter, domain, highlightedWord }: SkillBarChartProps) {
  if (data.length === 0) return null;

  if (data.length === 1) {
    const [item] = data;
    return (
      <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
        <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: p.contrastTextColor }}>
          {item.skill}
          {item.highlighted && (
            <span style={{ color: p.clearAnswerButtonColor }}> {WARNING_ICON} {highlightedWord}</span>
          )}
        </p>
        <p
          style={{
            margin: '0.25rem 0 0',
            fontSize: '2.25rem',
            fontWeight: 700,
            color: item.highlighted ? p.clearAnswerButtonColor : p.contrastTextColor,
          }}
        >
          {item.valueLabel}
        </p>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: p.contrastTextColor, opacity: 0.8 }}>
          {item.detailLabel}
        </p>
      </div>
    );
  }

  const longestLabelLen = Math.max(...data.map((d) => d.skill.length + (d.highlighted ? 4 : 0)));
  const axisWidth = Math.min(MAX_AXIS_WIDTH, Math.max(MIN_AXIS_WIDTH, longestLabelLen * AVG_CHAR_PX + 16));
  const maxCharsPerLine = Math.max(8, Math.floor((axisWidth - 24) / AVG_CHAR_PX));
  const chartHeight = data.length * ROW_HEIGHT + CHART_TOP_MARGIN + CHART_BOTTOM_MARGIN;

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: CHART_TOP_MARGIN, right: 48, bottom: CHART_BOTTOM_MARGIN, left: 0 }}
        barCategoryGap="30%"
      >
        <XAxis
          type="number"
          domain={domain ?? [0, (max: number) => Math.ceil(max * 1.15)]}
          allowDecimals={false}
          tickFormatter={axisFormatter}
          tick={{ fontSize: 11, fill: p.contrastTextColor, fillOpacity: 0.7 }}
          axisLine={{ stroke: p.disabledButtonColor, strokeOpacity: 0.4 }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="skill"
          width={axisWidth}
          axisLine={{ stroke: p.disabledButtonColor, strokeOpacity: 0.4 }}
          tickLine={false}
          interval={0}
          tick={(tickProps: YAxisTickContentProps) => SkillTick(tickProps, data, maxCharsPerLine, p)}
        />
        <Tooltip
          cursor={{ fill: p.contrastTextColor, fillOpacity: 0.08 }}
          content={(tooltipProps) => ChartTooltip(tooltipProps, p, highlightedWord)}
        />
        <Bar dataKey="value" barSize={22} radius={[0, 4, 4, 0]} activeBar={{ fillOpacity: 0.85 }}>
          {data.map((entry) => (
            <Cell key={entry.skill} fill={entry.highlighted ? p.clearAnswerButtonColor : p.buttonColor} />
          ))}
          <LabelList
            dataKey="valueLabel"
            position="right"
            style={{ fill: p.contrastTextColor, fontSize: 12, fontWeight: 700 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
