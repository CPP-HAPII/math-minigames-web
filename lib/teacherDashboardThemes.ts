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

export const darkGreenDashboardTheme: DashboardTheme = {
  idKey: 'teacher dark green',
  label: 'Green',
  pageBackground: '#121916',
  headerBackground: 'linear-gradient(90deg, #0B241C 0%, #14392C 100%)',
  cardBackground: '#1B2622',
  cardBorder: '#2C3D36',
  navInactiveBackground: '#182420',
  navBorder: '#2C3D36',
  text: '#FFFFFF',
  // Softened from a more saturated #1E8F6E — that read as too vivid/neon
  // across large bar fills and button backgrounds.
  accent: '#3FA98A',
  accentText: '#FFFFFF',
  warning: '#E57373',
  pickerInactiveBackground: '#121916',
  axisLine: '#3A4D45',
};

export const darkBlueDashboardTheme: DashboardTheme = {
  idKey: 'teacher dark blue',
  label: 'Blue',
  pageBackground: '#10161F',
  headerBackground: 'linear-gradient(90deg, #0B1A2C 0%, #163756 100%)',
  cardBackground: '#18222F',
  cardBorder: '#28384A',
  navInactiveBackground: '#141E29',
  navBorder: '#28384A',
  text: '#FFFFFF',
  accent: '#3A7FC4',
  accentText: '#FFFFFF',
  warning: '#E57373',
  pickerInactiveBackground: '#10161F',
  axisLine: '#3E5266',
};

export const darkPlumDashboardTheme: DashboardTheme = {
  idKey: 'teacher dark plum',
  label: 'Plum',
  pageBackground: '#181420',
  headerBackground: 'linear-gradient(90deg, #140F1C 0%, #362A55 100%)',
  cardBackground: '#221B2E',
  cardBorder: '#372C48',
  navInactiveBackground: '#1D1728',
  navBorder: '#372C48',
  text: '#FFFFFF',
  // Softened from a more saturated #6C5CC7 — same reason as green above.
  accent: '#8A7FD1',
  accentText: '#FFFFFF',
  warning: '#E57373',
  pickerInactiveBackground: '#181420',
  axisLine: '#4A3E63',
};

/** Ordered array of teacher-dashboard themes; index matches useTeacherDashboardThemeStore's themeIndex. */
export const teacherDashboardThemes: [DashboardTheme, DashboardTheme, DashboardTheme] = [
  darkGreenDashboardTheme,
  darkBlueDashboardTheme,
  darkPlumDashboardTheme,
];
