// Color palette for /teacher-portal. The kid-facing ColorProfiles in
// lib/themes.ts are tuned for mascot-y solid color blocks and bright option
// buttons; a data-dense dashboard for adults needs calmer surfaces, so the
// dashboard keeps its own palette per theme. WHICH theme is active is shared
// with the rest of the app (lib/stores/themeStore.ts): picking Bucky or Billy
// anywhere — sign-in, home, play or here — applies everywhere. Each entry's
// idKey matches its lib/themes.ts counterpart.
//
// Each theme is built around one partner school's brand: SCU red ("Bucky the
// Bronco") and CPP green ("Billy Bronco"). Brand color is used for the header,
// selected states and data marks; content sits on white cards over a lightly
// tinted canvas so charts and numbers stay easy to read. Gold is shared across
// both themes because it signals "needs attention", not brand identity.

export interface DashboardTheme {
  idKey: string;
  /** Label shown on this theme's button in the switcher. */
  label: string;

  /** Page background behind the cards. */
  canvas: string;
  /** Card background. */
  surface: string;
  /** Subtle inset background (detail header, empty state). */
  surfaceAlt: string;
  /** Hairline borders between cards, rows and panels. */
  border: string;
  /** Borders on interactive controls (inputs, unselected chips). */
  borderStrong: string;

  /** Primary text on surface/canvas. */
  text: string;
  /** Secondary text (captions, axis labels). Must stay ≥4.5:1 on surface. */
  textMuted: string;

  /** CSS `background` (gradient) for the header banner — matches the rest of the app's banners. */
  headerBackground: string;
  /** Active theme pill in the header banner. */
  headerPillActive: string;

  /** Selected states (chips, avatars, primary buttons). */
  brand: string;
  /** Text on `brand`. */
  onBrand: string;
  /** Secondary text on `brand`. */
  onBrandMuted: string;
  /** Focus ring and avatar initials. */
  highlight: string;

  /** Bars and data marks for the "on target" state. */
  accent: string;
  /** Icon/link color on surface. */
  accentInk: string;
  /** Tinted backgrounds for icon chips and soft badges. */
  accentSoft: string;
  /** Empty bar track. */
  track: string;

  /** Bars for skills below the weak-topic threshold — the original portal's gold. */
  warningFill: string;
  /** Text for weak-topic values on surface (readable gold). */
  warningText: string;
  /** Soft warning badge background. */
  warningSoft: string;

  /** Four-step sequential scale, least → most support (assist tiers, skill health). */
  scale: [string, string, string, string];
}

const SHARED_WARNING = {
  warningFill: '#FDB201',
  warningText: '#8A5A00',
  warningSoft: '#FFF4D6',
} as const;

export const SCUTheme: DashboardTheme = {
  idKey: 'SCU flavor',
  label: 'Bucky the Bronco',
  canvas: '#F7F5F5',
  surface: '#FFFFFF',
  surfaceAlt: '#FBF7F7',
  border: '#EBE2E3',
  borderStrong: '#D9C8CA',
  text: '#231416',
  textMuted: '#6B5B5E',
  brand: '#7A0014',
  onBrand: '#FFFFFF',
  onBrandMuted: '#F2C9CE',
  headerBackground: 'linear-gradient(to bottom, #9a0016 0%, #d8001f 70%, #8a0012 82%, #6e000e 100%)',
  headerPillActive: '#e23b4c',
  highlight: '#FDB201',
  accent: '#B3132B',
  accentInk: '#9A0016',
  accentSoft: '#FBEAEC',
  track: '#F3E9EA',
  ...SHARED_WARNING,
  scale: ['#F2D3D7', '#E0909A', '#C2394B', '#7A0014'],
};

export const CPPTheme: DashboardTheme = {
  idKey: 'CPP flavor',
  label: 'Billy Bronco',
  canvas: '#F4F6F3',
  surface: '#FFFFFF',
  surfaceAlt: '#F7FAF7',
  border: '#E1E7E2',
  borderStrong: '#C9D6CC',
  text: '#14231A',
  textMuted: '#5B6B61',
  brand: '#0F3D23',
  onBrand: '#FFFFFF',
  onBrandMuted: '#B9D3C2',
  headerBackground: 'linear-gradient(to bottom, #003a26 0%, #00804c 70%, #00452c 80%, #003d27 100%)',
  headerPillActive: '#38924e',
  highlight: '#FFB500',
  accent: '#2E7D4F',
  accentInk: '#1F6B3F',
  accentSoft: '#EAF3EC',
  track: '#EAF0EB',
  ...SHARED_WARNING,
  scale: ['#D6E9DC', '#93C4A2', '#4E9A6A', '#1F6B3F'],
};

/** Teacher-dashboard palettes, in the same order as lib/themes.ts's `themes`. */
export const teacherDashboardThemes: [DashboardTheme, DashboardTheme] = [SCUTheme, CPPTheme];

/** The dashboard palette for an app theme, matched by idKey (falls back to the first). */
export function dashboardThemeFor(idKey: string): DashboardTheme {
  return teacherDashboardThemes.find((t) => t.idKey === idKey) ?? teacherDashboardThemes[0];
}
