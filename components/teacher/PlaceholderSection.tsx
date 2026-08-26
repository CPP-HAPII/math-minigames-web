'use client';

import type { DashboardTheme } from '@/lib/teacherDashboardThemes';

interface PlaceholderSectionProps {
  title: string;
  description: string;
  /** "Coming later" bullet list — what this section will eventually show. */
  comingSoon: string[];
  profile: DashboardTheme;
}

/**
 * Shared empty-state card for each teacher-portal section. Structure only —
 * no data, no calls into analyticsDataService/analyticsService. Those get
 * wired in a later stage.
 */
export default function PlaceholderSection({ title, description, comingSoon, profile: p }: PlaceholderSectionProps) {
  return (
    <div
      style={{
        backgroundColor: p.cardBackground,
        border: `1px solid ${p.cardBorder}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
        borderRadius: '1rem',
        padding: '1.5rem 1.75rem',
        maxWidth: '760px',
      }}
    >
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem', color: p.text }}>{title}</h2>
      <p style={{ fontSize: '0.95rem', margin: '0 0 1rem', color: p.text, opacity: 0.85 }}>{description}</p>
      <p style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.5rem', color: p.text, opacity: 0.7 }}>
        Coming soon
      </p>
      <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {comingSoon.map((item) => (
          <li key={item} style={{ fontSize: '0.9rem', color: p.text, opacity: 0.85 }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
