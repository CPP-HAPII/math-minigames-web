'use client';

/**
 * Shell for /teacher-portal: the gradient banner (title, dashboard theme switcher,
 * back link) used across the app, above the portal content.
 * Structure only — no auth/role gating (there is no role concept anywhere in
 * this app yet; that's a separate later stage), no data fetching.
 *
 * Class Overview, Student Detail and Assist Usage used to be separate tabs;
 * they're now one page (components/teacher/TeacherPortalDashboard.tsx), so
 * there's no section nav here anymore. The old URLs redirect to it.
 *
 * Styling uses the teacher portal's own DashboardTheme palette
 * (lib/teacherDashboardThemes.ts), picked by the app-wide theme choice
 * (lib/stores/themeStore.ts), so Bucky/Billy stays consistent on every page.
 */

import Link from 'next/link';
import { useDashboardTheme } from '@/lib/hooks/useDashboardTheme';
import TeacherThemeSwitcher from '@/components/teacher/TeacherThemeSwitcher';
import { portalStyles, themeVars } from '@/components/teacher/ui';

export default function TeacherPortalLayout({ children }: { children: React.ReactNode }) {
  const t = useDashboardTheme();

  return (
    <div className={portalStyles.root} style={{ ...themeVars(t), background: t.canvas, color: t.text, minHeight: '100vh', width: '100%' }}>
      {/* Banner: same gradient, layout and type as the app's other banners (kept as the original portal header). */}
      <header
        style={{
          background: t.headerBackground,
          padding: '0.85rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          fontFamily: 'Arial, Helvetica, sans-serif',
        }}
      >
        <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: t.onBrand, margin: 0 }}>Teacher Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <TeacherThemeSwitcher />
          <Link
            href="/"
            style={{ fontSize: '0.85rem', fontWeight: 700, color: t.onBrand, opacity: 0.85, textDecoration: 'none' }}
          >
            ← Back to app
          </Link>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
