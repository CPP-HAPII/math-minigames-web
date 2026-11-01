// Color system for /teacher-portal/*, deliberately separate from lib/themes.ts.
// The kid-facing Green/Hapii/Dark-green themes are tuned for play screens
// (mascot-y solid color blocks, bright option buttons) and were never a good
// fit for a data-dense dashboard aimed at adults — Hapii's hot-pink bars on
// teal cards being the clearest case. The dashboard now owns its own palette
// and switcher, so it never again shifts color just because a kid picked a
// different theme on the play screen at home.
//
// All three themes are dark (per explicit preference — no light/white
// option), each built around one of the app's existing brand hues (green /
// blue / purple, the same family as BASE_LEVEL_PALETTE in lib/themes.ts) so
// the choice still feels native to the app rather than arbitrary. Each also
// gives cards a real surface color distinct from the page background, with a
// border, instead of the old flat "every card is headerColor" look.

export interface DashboardTheme {
  idKey: string;
  /** Label shown on this theme's button in the switcher, e.g. 'Dark blue'. */
  label: string;

  pageBackground: string;
  /** CSS `background` value (solid or gradient) for the header bar. */
  headerBackground: string;

  cardBackground: string;
  cardBorder: string;

  navInactiveBackground: string;
  navBorder: string;

  /** Primary text color, used everywhere against pageBackground/cardBackground. */
  text: string;

  /** Bars, active nav pill, active student-picker button, action buttons, chart tooltip border. */
  accent: string;
  /** Text color for content sitting directly on `accent`. */
  accentText: string;

  /** Weak-topic rows/bars — kept the same coral across all three themes since it signals "needs attention", not brand identity. */
  warning: string;

  pickerInactiveBackground: string;
  /** Chart axis lines. */
  axisLine: string;
}

export const SCUTheme: DashboardTheme = {
  idKey: 'SCU flavor',
  label: 'Bucky the Bronco',
  pageBackground: '#fcfcfc',
  headerBackground: 'linear-gradient(to bottom, #9a0016 0%, #d8001f 70%, #8a0012 82%, #6e000e 100%)',
  cardBackground: '#a20110',
  cardBorder: '#a20110',
  navInactiveBackground: '#a20110',
  navBorder: '#a20110',
  text: '#FFFFFF',
  // Softened from a more saturated #1E8F6E — that read as too vivid/neon
  // across large bar fills and button backgrounds.
  accent: '#e23b4c',
  accentText: '#FFFFFF',
  warning: '#fdb201',
  pickerInactiveBackground: '#fdb201',
  axisLine: '#888888',
};

export const CPPTheme: DashboardTheme = {
  idKey: 'CPP flavor',
  label: 'Billy Bronco',
  pageBackground: '#fcfcfc',
  headerBackground: 'linear-gradient(to bottom, #003a26 0%, #00804c 70%, #00452c 80%, #003d27 100%)',
  cardBackground: '#114725',
  cardBorder: '#114725',
  navInactiveBackground: '#114725',
  navBorder: '#114725',
  text: '#FFFFFF',
  accent: '#38924e',
  accentText: '#FFFFFF',
  warning: '#fdb201',
  pickerInactiveBackground: '#fdb201',
  axisLine: '#888888',
};

/** Ordered array of teacher-dashboard themes; index matches useTeacherDashboardThemeStore's themeIndex. */
export const teacherDashboardThemes: [DashboardTheme, DashboardTheme] = [
  SCUTheme,
  CPPTheme,
];
