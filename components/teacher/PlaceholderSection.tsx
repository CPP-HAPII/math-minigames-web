'use client';

import type { ColorProfile } from '@/lib/themes';

interface PlaceholderSectionProps {
  title: string;
  description: string;
  /** "Coming later" bullet list — what this section will eventually show. */
  comingSoon: string[];
  profile: ColorProfile;
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
        backgroundColor: p.headerColor,
        borderRadius: '1rem',
        padding: '1.5rem 1.75rem',
        maxWidth: '760px',
      }}
    >
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem', color: p.contrastTextColor }}>
        {title}
      </h2>
      <p style={{ fontSize: '0.95rem', margin: '0 0 1rem', color: p.contrastTextColor, opacity: 0.85 }}>
        {description}
      </p>
      <p style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.5rem', color: p.contrastTextColor, opacity: 0.7 }}>
        Coming soon
      </p>
      <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {comingSoon.map((item) => (
          <li key={item} style={{ fontSize: '0.9rem', color: p.contrastTextColor, opacity: 0.85 }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
