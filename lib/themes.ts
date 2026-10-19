// Shared colors and school banners for the two coaches: Bucky and Billy.
// Keep the existing themes export and persisted themeIndex API.

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
  /** Coach name shown in Settings. */
  homeLabel: string;
  /** CSS `background` value (solid or gradient) for the page root. */
  homePageBackground: string;
  /** CSS `background` value for the header bar. */
  homeHeaderBackground: string;
  /** Banner artwork drawn on the right side of the coach header; '' for none. */
  homeHeaderImage: string;
  
  /** Banner art height relative to the header, e.g. '220%'. Bigger = larger mission. */
  homeHeaderImageHeight: string;
  /** Bottom offset for the banner art, e.g. '-25%'. More negative = more ground hidden below the header. */
  homeHeaderImageOffset: string;
  /** CSS `border-bottom` value for the header bar; '' when none. */
  homeHeaderBorderBottom: string;
  /** Solid welcome-heading text color; '' when homeWelcomeGradient is used instead. */
  homeWelcomeColor: string;
  /** CSS gradient for a gradient-clipped welcome heading; '' when homeWelcomeColor is used instead. */
  homeWelcomeGradient: string;
  /** font-family value for the welcome heading. */
  homeWelcomeFont: string;
  /** Opaque background for Language Assist panels and selected settings options. */
  homePanelBackground: string;
  /** Opaque background for the Continue strip, level cards, and Settings dialog. */
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

  /** Coach mascot shown in the question card's corner; '' for none. */
  mascotImage: string;

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

export const SCUTheme: ColorProfile = {
idKey: 'SCU flavor',
mascotImage: '/bucky-mascot.png',

backgroundColor: '#fefefd',
headerColor: '#a20110',

buttonColor: '#fdb201',
textColor: '#340005',
contrastTextColor: '#ffffff',
checkAnswerButtonColor: '#fdb201',
clearAnswerButtonColor: '#a20110',
disabledButtonColor: '#888888',

cardBackground: '#a20110',
cardTextColor: '#fefefd',

homeHeaderImageHeight: '220%',
homeHeaderImageOffset: '-25%',

homeLabel: 'Bucky the Bronco',
homePageBackground: '#fefefd',
homeHeaderBackground: 'linear-gradient(to bottom, #9a0016 0%, #d8001f 70%, #8a0012 82%, #6e000e 100%)',
homeHeaderImage: '/bucky-banner.png',
homeHeaderBorderBottom: '',

homeWelcomeColor: '#ffffff',
homeWelcomeGradient: '',
homeWelcomeFont: "'Baloo 2', sans-serif",

homePanelBackground: '#fff1f2',
homeSurfaceBackground: '#fefefd',
homeBorder: '#a20110',
homeInk: '#a20110',
homeInkSoft: '#a2454e',
homeAccentSolid: '#a2454e',
homeAccentGradient: '#e23b4c',
homeUseGradientForActive: false,
homeThemeButtonActiveBackground: '#e23b4c',
homeThemeButtonActiveColor: '#340005',
homeThemeButtonInactiveColor: '#a20110',
homeThemeButtonInactiveBorder: '#a20110',
homeThemeButtonInactiveBackground: '#fdb201',

homeLevelPalette: [
  { accent: '#a20110', bg: '#efaab1', ink: '#cb2738' },
  { accent: '#a20110', bg: '#efaab1', ink: '#cb2738' },
  { accent: '#a20110', bg: '#efaab1', ink: '#cb2738' },
  { accent: '#a20110', bg: '#efaab1', ink: '#cb2738' },
  { accent: '#a20110', bg: '#efaab1', ink: '#cb2738' },
  ],
};

export const CPPTheme: ColorProfile = {
idKey: 'CPP flavor',
mascotImage: '/billy-mascot.png',

backgroundColor: '#fcfcfc',
headerColor: '#114725',

buttonColor: '#fdb302',
textColor: '#041e13',
contrastTextColor: '#ffffff',
checkAnswerButtonColor: '#fdb302',
clearAnswerButtonColor: '#114725',
disabledButtonColor: '#888888',

cardBackground: '#114725',
cardTextColor: '#cce8d3',

homeHeaderImageHeight: '400%',
homeHeaderImageOffset: '-70%',

homeLabel: 'Billy Bronco',
homePageBackground: '#fcfcfc',
homeHeaderBackground: 'linear-gradient(to bottom, #003a26 0%, #00804c 70%, #00452c 80%, #003d27 100%)',
homeHeaderImage: '/billy-banner.png',
homeHeaderBorderBottom: '',
homeWelcomeColor: '#ffffff',
homeWelcomeGradient: '',
homeWelcomeFont: "'Baloo 2', sans-serif",
homePanelBackground: '#cce8d3',
homeSurfaceBackground: '#fcfcfc',
homeBorder: '#114725',
homeInk: '#114725',
homeInkSoft: '#2d533b',
homeAccentSolid: '#2d533b',
homeAccentGradient: '#38924e',
homeUseGradientForActive: false,
homeThemeButtonActiveBackground: '#38924e',
homeThemeButtonActiveColor: '#041e13',
homeThemeButtonInactiveColor: '#114725',
homeThemeButtonInactiveBorder: '#114725',
homeThemeButtonInactiveBackground: '#fdb302',

homeLevelPalette: [
  { accent: '#114725', bg: '#cce8d3', ink: '#1d783e' },
  { accent: '#114725', bg: '#cce8d3', ink: '#1d783e' },
  { accent: '#114725', bg: '#cce8d3', ink: '#1d783e' },
  { accent: '#114725', bg: '#cce8d3', ink: '#1d783e' },
  { accent: '#114725', bg: '#cce8d3', ink: '#1d783e' },
  ],
};

/** Ordered array of themes matching ThemeController._getProfileByIndex() indices (0-1). */
export const themes: [ColorProfile, ColorProfile] = [SCUTheme, CPPTheme];
