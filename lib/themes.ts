// Core gameplay colors are ported from constants.dart (see git history for the
// original 4-theme Flutter mapping). The redesigned home screen (see
// mathminigames_redesign_mockup_v2.html) introduced a distinct 3-theme system
// (Green / Hapii / Dark green); this file now carries both: the original
// flat gameplay palette (used by PlayContent + components/games/*) and the
// richer "home*" fields the redesigned home screen needs (gradients, panel/
// card colors, per-level accents). Kept as ONE profile per theme, rather than
// two parallel arrays, so there is never a risk of the two halves drifting
// out of sync under the same persisted themeIndex.

export interface HomeLevelAccent {
  accent: string;
  bg: string;
  ink: string;
}

export interface ColorProfile {
  idKey: string;

  // ── Core gameplay fields (PlayContent, components/games/*, Calculator, ProgressBar) ──
  backgroundColor: string;
  headerColor: string;
  buttonColor: string;
  textColor: string;
  contrastTextColor: string;
  checkAnswerButtonColor: string;
  clearAnswerButtonColor: string;
  disabledButtonColor: string;
  /** Background for the smaller colorful surface on the play page — currently the
   * choice/option buttons in JumbleGame, TypingGame, FillBlanksGame, PlaybackGame,
   * ReadAloudGame (the bigger instruction/question/answer cards use homeAccentGradient
   * instead, since the two were deliberately swapped: the bigger card area shows the
   * prettier gradient, the smaller buttons get the flatter color). Split out from
   * headerColor so a theme can style these independently of headerColor's other
   * consumers (Calculator modal, TranslateButton pill, hover-translate tooltip). */
  cardBackground: string;
  /** Text color paired with cardBackground
   * the same way contrastTextColor pairs with headerColor everywhere else. */
  cardTextColor: string;

  // ── Home-screen fields (app/home/page.tsx, components/home/*) ──
  /** Label shown on this theme's button in the switcher, e.g. 'Dark green'. */
  homeLabel: string;
  /** CSS `background` value (solid or gradient) for the page root. */
  homePageBackground: string;
  /** CSS `background` value for the header bar. */
  homeHeaderBackground: string;
  /** CSS `border-bottom` value for the header bar; '' when none. */
  homeHeaderBorderBottom: string;
  /** Solid welcome-heading text color; '' when homeWelcomeGradient is used instead. */
  homeWelcomeColor: string;
  /** CSS gradient for a gradient-clipped welcome heading; '' when homeWelcomeColor is used instead. */
  homeWelcomeGradient: string;
  /** font-family value for the welcome heading. */
  homeWelcomeFont: string;
  /** Language Assist panel background. */
  homePanelBackground: string;
  /** Continue strip + level card background. */
  homeSurfaceBackground: string;
  homeBorder: string;
  /** Primary body text color on home-screen surfaces. */
  homeInk: string;
  /** Secondary/muted text color on home-screen surfaces. */
  homeInkSoft: string;
  /** Solid accent used for active option pills / "done" chips in Green and Dark green. */
  homeAccentSolid: string;
  /** Gradient accent used for the Play button always, and for active pills/chips in Hapii. */
  homeAccentGradient: string;
  /** true only for Hapii: active option pills / "done" chips use homeAccentGradient instead of homeAccentSolid. */
  homeUseGradientForActive: boolean;
  homeThemeButtonActiveBackground: string;
  homeThemeButtonActiveColor: string;
  homeThemeButtonInactiveColor: string;
  homeThemeButtonInactiveBorder: string;
  homeThemeButtonInactiveBackground: string;
  /** Per-level badge/name accent, indexed 0-4 for levels 1-5. */
  homeLevelPalette: [HomeLevelAccent, HomeLevelAccent, HomeLevelAccent, HomeLevelAccent, HomeLevelAccent];
}

const BASE_LEVEL_PALETTE: [HomeLevelAccent, HomeLevelAccent, HomeLevelAccent, HomeLevelAccent, HomeLevelAccent] = [
  { accent: '#1D9E75', bg: '#E1F5EE', ink: '#085041' },
  { accent: '#4CA6E0', bg: '#E6F1FB', ink: '#0C447C' },
  { accent: '#8B7FE8', bg: '#EEEDFE', ink: '#3C3489' },
  { accent: '#E0703C', bg: '#FAECE7', ink: '#712B13' },
  { accent: '#E8598E', bg: '#FBEAF0', ink: '#72243E' },
];

export const greenTheme: ColorProfile = {
  idKey: 'green flavor',

  // Softened from the original olive-moss look — reuses the same mint/green
  // tones already established by this theme's home-screen palette below,
  // rather than introducing new colors.
  backgroundColor: '#EAF6EF',
  headerColor: '#1D9E75',
  // Muted from #60c6d8 — this drives the Speak/mic buttons, which read too
  // bright/saturated at the original shade. Desaturated rather than
  // lightened further, so the white button text stays readable.
  buttonColor: '#6FB9C7',
  textColor: '#000000',
  contrastTextColor: '#ffffff',
  checkAnswerButtonColor: '#6fd800',
  // Softer than the original saturated red — same "clear/wrong" meaning, less harsh.
  clearAnswerButtonColor: '#E57373',
  disabledButtonColor: '#9e9e9e',
  cardBackground: '#1D9E75',
  cardTextColor: '#ffffff',

  homeLabel: 'Green',
  homePageBackground: '#F5FBF7',
  homeHeaderBackground: 'linear-gradient(90deg, #0F6E56 0%, #1D9E75 100%)',
  homeHeaderBorderBottom: '',
  homeWelcomeColor: '#ffffff',
  homeWelcomeGradient: '',
  homeWelcomeFont: "'Baloo 2', sans-serif",
  homePanelBackground: '#EAF6EF',
  homeSurfaceBackground: '#FFFFFF',
  homeBorder: '#DCEAE1',
  homeInk: '#1E3A32',
  homeInkSoft: '#5C6E67',
  homeAccentSolid: '#1D9E75',
  homeAccentGradient: 'linear-gradient(90deg, #1D9E75 0%, #4CA6E0 100%)',
  homeUseGradientForActive: false,
  homeThemeButtonActiveBackground: '#ffffff',
  homeThemeButtonActiveColor: '#0F6E56',
  homeThemeButtonInactiveColor: '#ffffff',
  homeThemeButtonInactiveBorder: 'rgba(255,255,255,.5)',
  homeThemeButtonInactiveBackground: 'rgba(255,255,255,.12)',
  homeLevelPalette: BASE_LEVEL_PALETTE,
};

export const hapiiTheme: ColorProfile = {
  idKey: 'hapii flavor',

  // No "current site" precedent for Hapii. headerColor/buttonColor were
  // originally the same blue/purple pair as the home-screen accent, which
  // reads as harsh on a full-page play background; swapped for a teal/pink
  // pair pulled from elsewhere in this theme's own gradient endpoints instead.
  backgroundColor: '#F3F6FA',
  headerColor: '#2FB8A6',
  // Muted from #E8598E — this drives the Speak/mic buttons, which read too
  // bright/saturated at the original shade. Desaturated rather than
  // lightened further, so the white button text stays readable.
  buttonColor: '#D97CA0',
  textColor: '#1E2A3A',
  contrastTextColor: '#ffffff',
  checkAnswerButtonColor: '#4caf50',
  clearAnswerButtonColor: '#E57373',
  disabledButtonColor: '#9e9e9e',
  // Cards go white/home-style instead of a solid color block — matches the
  // home screen's white surfaces, with color kept on the interactive pieces
  // (option buttons, Translate/Speak pills) rather than the whole card.
  cardBackground: '#FFFFFF',
  cardTextColor: '#1E2A3A',

  homeLabel: 'Hapii',
  homePageBackground: 'linear-gradient(135deg, #F5FBF7 0%, #F1F2FA 45%, #FCEEF4 100%)',
  homeHeaderBackground: '#FFFFFF',
  homeHeaderBorderBottom: '1px solid #E2E7EF',
  homeWelcomeColor: '',
  homeWelcomeGradient: 'linear-gradient(90deg, #4CA6E0 0%, #8B7FE8 55%, #E8598E 100%)',
  homeWelcomeFont: "'Caveat', cursive",
  homePanelBackground: '#FFFFFF',
  homeSurfaceBackground: '#FFFFFF',
  homeBorder: '#E2E7EF',
  homeInk: '#1E2A3A',
  homeInkSoft: '#5C6672',
  homeAccentSolid: '#8B7FE8',
  homeAccentGradient: 'linear-gradient(90deg, #4CA6E0 0%, #8B7FE8 55%, #E8598E 100%)',
  homeUseGradientForActive: true,
  homeThemeButtonActiveBackground: 'linear-gradient(90deg, #4CA6E0 0%, #8B7FE8 55%, #E8598E 100%)',
  homeThemeButtonActiveColor: '#ffffff',
  homeThemeButtonInactiveColor: '#5C6672',
  homeThemeButtonInactiveBorder: '#E2E7EF',
  homeThemeButtonInactiveBackground: 'transparent',
  // Rotated one position from the base palette: the mockup only redefines lvl1/lvl2
  // for Hapii (to blue/purple) and leaves lvl3-5 untouched, which would make lvl2
  // and lvl3 collide on purple. Since every level is clickable here (no locking
  // hides levels 3-5), a straight rotation keeps all 5 levels visually distinct.
  homeLevelPalette: [
    { accent: '#4CA6E0', bg: '#E6F1FB', ink: '#0C447C' },
    { accent: '#8B7FE8', bg: '#EEEDFE', ink: '#3C3489' },
    { accent: '#E0703C', bg: '#FAECE7', ink: '#712B13' },
    { accent: '#E8598E', bg: '#FBEAF0', ink: '#72243E' },
    { accent: '#1D9E75', bg: '#E1F5EE', ink: '#085041' },
  ],
};

export const darkGreenTheme: ColorProfile = {
  idKey: 'dark green flavor',

  backgroundColor: '#1A2420',
  headerColor: '#0F3A2E',
  // Muted from #1D9E75 — this drives the Speak/mic buttons, which read too
  // bright/saturated at the original shade. Desaturated rather than
  // lightened further, so the white button text stays readable.
  buttonColor: '#35A484',
  textColor: '#EAF3EE',
  contrastTextColor: '#ffffff',
  checkAnswerButtonColor: '#4caf50',
  clearAnswerButtonColor: '#E57373',
  disabledButtonColor: '#324A40',
  cardBackground: '#0F3A2E',
  cardTextColor: '#ffffff',

  homeLabel: 'Dark green',
  homePageBackground: '#1A2420',
  homeHeaderBackground: 'linear-gradient(90deg, #0F3A2E 0%, #0F6E56 100%)',
  homeHeaderBorderBottom: '',
  homeWelcomeColor: '#ffffff',
  homeWelcomeGradient: '',
  homeWelcomeFont: "'Baloo 2', sans-serif",
  homePanelBackground: '#22322B',
  homeSurfaceBackground: '#22322B',
  homeBorder: '#324A40',
  homeInk: '#EAF3EE',
  homeInkSoft: '#9FB3AB',
  homeAccentSolid: '#1D9E75',
  homeAccentGradient: 'linear-gradient(90deg, #1D9E75 0%, #4CA6E0 100%)',
  homeUseGradientForActive: false,
  homeThemeButtonActiveBackground: '#ffffff',
  homeThemeButtonActiveColor: '#0F3A2E',
  homeThemeButtonInactiveColor: '#9FB3AB',
  homeThemeButtonInactiveBorder: '#324A40',
  homeThemeButtonInactiveBackground: 'transparent',
  // Same hues as the base palette; only the ink shade is lightened for
  // legibility against the dark card background (mockup explicitly does this
  // for lvl1/lvl2 — extended here to lvl3-5 since none of them are locked/hidden).
  homeLevelPalette: [
    { accent: '#1D9E75', bg: '#E1F5EE', ink: '#5DCAA5' },
    { accent: '#4CA6E0', bg: '#E6F1FB', ink: '#85B7EB' },
    { accent: '#8B7FE8', bg: '#EEEDFE', ink: '#B7AEF5' },
    { accent: '#E0703C', bg: '#FAECE7', ink: '#F0A47D' },
    { accent: '#E8598E', bg: '#FBEAF0', ink: '#F291B3' },
  ],
};

/** Ordered array of themes matching ThemeController._getProfileByIndex() indices (0-2). */
export const themes: [ColorProfile, ColorProfile, ColorProfile] = [greenTheme, hapiiTheme, darkGreenTheme];
