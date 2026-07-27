'use client';

/**
 * Shared shell for /teacher-portal/*: header + section nav. Structure only —
 * no auth/role gating (there is no role concept anywhere in this app yet;
 * that's a separate later stage), no data fetching.
 *
 * Styling matches the rest of the app (inline style objects driven by the
 * active ColorProfile, hydration guard for the Zustand-persisted theme) —
 * no new UI library or styling system introduced.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useThemeStore, selectActiveProfile } from '@/lib/stores/themeStore';
import { themes } from '@/lib/themes';

const NAV_SECTIONS = [
  { href: '/teacher-portal/overview', label: 'Class Overview' },
  { href: '/teacher-portal/students', label: 'Student Detail' },
  { href: '/teacher-portal/assist-usage', label: 'Assist Usage' },
] as const;

export default function TeacherPortalLayout({ children }: { children: React.ReactNode }) {
  const profile = useThemeStore(selectActiveProfile);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const p = hydrated ? profile : themes[0];

  const pathname = usePathname();

  return (
    <main style={{ backgroundColor: p.backgroundColor, minHeight: '100vh', color: p.textColor }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        style={{
          backgroundColor: p.headerColor,
          padding: '0.85rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: p.contrastTextColor, margin: 0 }}>
          Teacher Dashboard
        </h1>
        <Link
          href="/home"
          style={{ fontSize: '0.85rem', color: p.contrastTextColor, opacity: 0.8, textDecoration: 'none' }}
        >
          ← Back to app
        </Link>
      </header>

      {/* ── Section nav ────────────────────────────────────────────────── */}
      <nav
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          padding: '1rem 1.5rem 0',
        }}
      >
        {NAV_SECTIONS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              style={{
                backgroundColor: active ? p.buttonColor : p.headerColor,
                color: p.textColor,
                border: `1.5px solid ${p.textColor}22`,
                borderRadius: '0.5rem',
                padding: '0.5rem 1.1rem',
                fontWeight: active ? 700 : 400,
                fontSize: '0.95rem',
                textDecoration: 'none',
              }}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* ── Section content ────────────────────────────────────────────── */}
      <section style={{ padding: '1.5rem' }}>{children}</section>
    </main>
  );
}
