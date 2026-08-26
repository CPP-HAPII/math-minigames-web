'use client';

/**
 * Shared shell for /teacher-portal/*: header + section nav. Structure only —
 * no auth/role gating (there is no role concept anywhere in this app yet;
 * that's a separate later stage), no data fetching.
 *
 * Styling uses the teacher-portal's own DashboardTheme (lib/teacherDashboardThemes.ts),
 * not the kid-facing play-screen ColorProfile — kept separate on purpose so
 * this dashboard never shifts color just because a kid picked a different
 * theme on the play screen. No new UI library or styling system introduced.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTeacherDashboardThemeStore, selectActiveDashboardTheme } from '@/lib/stores/teacherDashboardThemeStore';
import { useHydrated } from '@/lib/hooks/useHydrated';
import { teacherDashboardThemes } from '@/lib/teacherDashboardThemes';
import TeacherThemeSwitcher from '@/components/teacher/TeacherThemeSwitcher';

const NAV_SECTIONS = [
  { href: '/teacher-portal/overview', label: 'Class Overview' },
  { href: '/teacher-portal/students', label: 'Student Detail' },
  { href: '/teacher-portal/assist-usage', label: 'Assist Usage' },
] as const;

export default function TeacherPortalLayout({ children }: { children: React.ReactNode }) {
  const profile = useTeacherDashboardThemeStore(selectActiveDashboardTheme);
  const hydrated = useHydrated();
  const t = hydrated ? profile : teacherDashboardThemes[0];

  const pathname = usePathname();

  return (
    <main style={{ backgroundColor: t.pageBackground, minHeight: '100vh', color: t.text, fontWeight: 700 }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        style={{
          background: t.headerBackground,
          borderBottom: `1px solid ${t.cardBorder}`,
          padding: '0.85rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: t.text, margin: 0 }}>Teacher Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <TeacherThemeSwitcher />
          <Link href="/home" style={{ fontSize: '0.85rem', color: t.text, opacity: 0.8, textDecoration: 'none' }}>
            ← Back to app
          </Link>
        </div>
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
                backgroundColor: active ? t.accent : t.navInactiveBackground,
                color: active ? t.accentText : t.text,
                border: `1.5px solid ${active ? 'transparent' : t.navBorder}`,
                borderRadius: '0.5rem',
                padding: '0.5rem 1.1rem',
                fontWeight: 700,
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
