'use client';

import { useMemo } from 'react';
import { useThemeStore, selectActiveProfile } from '@/lib/stores/themeStore';
import { useHydrated } from '@/lib/hooks/useHydrated';
import { themes, type ColorProfile } from '@/lib/themes';

/** idKey of the CPP / "Billy Bronco" profile in lib/themes.ts. It is the one palette that gets the exact colours from the "Math Minigames UI Color Palette" sheet. */
export const CPP_THEME_ID = 'CPP flavor';

/** Colours from the palette sheet. */
const cpp = {
  green: '#005030',
  gold: '#FFB81C',
  paleGold: '#FFF8E1',
  goldTint: '#FFE39A',
  warmWhite: '#FCFBF7',
  white: '#FFFFFF',
  darkGreen: '#164A3A',
  navy: '#102A72',
  teal: '#008C95',
  lavender: '#C9A7F5',
  pink: '#F45AA5',
  coral: '#FF8068',
  orange: '#FFB52E',
  paleLavender: '#F8F1FF',
  toggleTrack: '#B8BEC9',
  assistShadow: 'rgba(16, 42, 114, 0.12)',
  // Not on the sheet, but drawn that way in the mockup:
  cardBorder: '#164A3A',
  builderTint: 'rgba(184, 216, 200, 0.3)',
  mutedText: '#5B7A6E',
  danger: '#C4302B',
} as const;

const assistGradient = `linear-gradient(135deg, ${cpp.lavender} 0%, ${cpp.pink} 42%, ${cpp.coral} 74%, ${cpp.orange} 100%)`;

const font = {
  display: 'var(--font-baloo-2), sans-serif',
  body: 'var(--font-nunito), sans-serif',
} as const;

/**
 * Colours for the play screen (header chrome aside — AppHeader draws that from
 * useTokens). The CPP palette gets the exact values from the palette sheet and
 * the mockup; every older palette is derived from the ColorProfile fields it
 * already has, so picking one in Settings recolours the play screen without a
 * second set of per-theme numbers to maintain.
 */
export interface PlayTokens {
  pageBg: string;
  displayFont: string;
  bodyFont: string;

  /** White card holding the instruction + question. */
  cardBg: string;
  cardBorder: string;
  /** Instruction heading ("Build your answer with the word blocks."). */
  heading: string;
  /** The question text itself. */
  questionInk: string;
  mutedInk: string;

  /** Tinted panel around the answer area, word blocks and buttons. */
  builderBg: string;
  builderBorder: string;
  /** The dashed "build your sentence" area. */
  answerBg: string;
  answerBorder: string;
  answerInk: string;
  placeholderInk: string;

  blockBg: string;
  blockBorder: string;
  blockInk: string;

  /** Check Answer / Hear Question. `primaryBg` is a CSS `background` (may be a gradient). */
  primaryBg: string;
  primaryInk: string;
  primaryShadow: string;
  /** Clear / Pause / Stop. */
  secondaryBg: string;
  secondaryInk: string;
  secondaryBorder: string;

  progressTrack: string;
  progressFill: string;
  progressInk: string;

  success: string;
  danger: string;
  dangerBg: string;

  assist: {
    /** Gradient used for the panel border and icon badges. */
    frame: string;
    /** Soft wash behind the panel title row. */
    headerTint: string;
    title: string;
    surface: string;
    rowBg: string;
    rowBorder: string;
    /** Icons and the active toggle — the "main interaction accent". */
    accent: string;
    /** Body text and the translated question. */
    ink: string;
    translatedBg: string;
    shadow: string;
    toggleOff: string;
    toggleOn: string;
    /** Tooltip for hover-translated words: white inside, purple border. */
    tooltipBg: string;
    tooltipInk: string;
    tooltipBorder: string;
    tooltipShadow: string;
  };
}

/** Black or white, whichever reads better on a solid #RGB / #RRGGBB colour; `fallback` for anything else (gradients, rgba). */
export function readableOn(color: string, fallback: string): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return fallback;
  const hex = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return lum > 0.4 ? '#14201B' : '#FFFFFF';
}

const CPP_PLAY: PlayTokens = {
  pageBg: cpp.warmWhite,
  displayFont: font.display,
  bodyFont: font.body,

  cardBg: cpp.white,
  cardBorder: cpp.cardBorder,
  heading: cpp.green,
  questionInk: cpp.darkGreen,
  mutedInk: cpp.mutedText,

  builderBg: cpp.builderTint,
  builderBorder: cpp.cardBorder,
  answerBg: cpp.paleGold,
  answerBorder: cpp.gold,
  answerInk: cpp.darkGreen,
  placeholderInk: cpp.darkGreen,

  blockBg: cpp.goldTint,
  blockBorder: cpp.gold,
  blockInk: cpp.darkGreen,

  primaryBg: `linear-gradient(180deg, ${cpp.gold} 0%, #F9A91B 100%)`,
  primaryInk: cpp.darkGreen,
  primaryShadow: 'rgba(255, 184, 28, 0.4)',
  secondaryBg: cpp.white,
  secondaryInk: cpp.darkGreen,
  secondaryBorder: cpp.cardBorder,

  progressTrack: '#E7E9E8',
  progressFill: cpp.gold,
  progressInk: cpp.darkGreen,

  success: cpp.green,
  danger: cpp.danger,
  dangerBg: '#FDEEEC',

  assist: {
    frame: assistGradient,
    headerTint: 'linear-gradient(90deg, rgba(201,167,245,0.30) 0%, rgba(244,90,165,0.16) 55%, rgba(255,181,46,0.22) 100%)',
    title: cpp.darkGreen,
    surface: cpp.white,
    rowBg: cpp.white,
    rowBorder: 'rgba(16, 42, 114, 0.10)',
    accent: cpp.teal,
    ink: cpp.navy,
    translatedBg: cpp.paleLavender,
    shadow: cpp.assistShadow,
    toggleOff: cpp.toggleTrack,
    toggleOn: cpp.teal,
    tooltipBg: cpp.white,
    tooltipInk: cpp.navy,
    tooltipBorder: '#8B5CF6',
    tooltipShadow: 'rgba(91, 52, 190, 0.28)',
  },
};

function derivePlay(p: ColorProfile): PlayTokens {
  const primaryBg = p.checkAnswerButtonColor;
  const accentFill = p.homeUseGradientForActive ? p.homeAccentGradient : p.homeAccentSolid;
  return {
    pageBg: p.homePageBackground,
    displayFont: font.display,
    bodyFont: font.body,

    cardBg: p.homeSurfaceBackground,
    cardBorder: p.homeBorder,
    heading: p.homeInk,
    questionInk: p.homeInk,
    mutedInk: p.homeInkSoft,

    builderBg: p.homePanelBackground,
    builderBorder: p.homeBorder,
    answerBg: p.homeSurfaceBackground,
    answerBorder: p.homeAccentSolid,
    answerInk: p.homeInk,
    placeholderInk: p.homeInkSoft,

    blockBg: p.cardBackground,
    blockBorder: p.homeAccentSolid,
    blockInk: p.cardTextColor,

    primaryBg,
    primaryInk: readableOn(primaryBg, p.contrastTextColor),
    primaryShadow: 'rgba(0, 0, 0, 0.18)',
    secondaryBg: p.homeSurfaceBackground,
    secondaryInk: p.homeInk,
    secondaryBorder: p.homeInkSoft,

    progressTrack: 'rgba(127, 127, 127, 0.22)',
    progressFill: accentFill,
    progressInk: p.homeInk,

    success: p.checkAnswerButtonColor,
    danger: p.clearAnswerButtonColor,
    dangerBg: 'rgba(229, 115, 115, 0.14)',

    assist: {
      frame: p.homeAccentGradient,
      headerTint: p.homePanelBackground,
      title: p.homeInk,
      surface: p.homeSurfaceBackground,
      rowBg: p.homeSurfaceBackground,
      rowBorder: p.homeBorder,
      accent: p.homeAccentSolid,
      ink: p.homeInk,
      translatedBg: p.homePanelBackground,
      shadow: 'rgba(0, 0, 0, 0.14)',
      toggleOff: '#8E96A3',
      toggleOn: p.homeAccentSolid,
      tooltipBg: p.homeSurfaceBackground,
      tooltipInk: p.homeInk,
      tooltipBorder: p.homeAccentSolid,
      tooltipShadow: 'rgba(0, 0, 0, 0.22)',
    },
  };
}

export function playTokensFor(profile: ColorProfile): PlayTokens {
  return profile.idKey === CPP_THEME_ID ? CPP_PLAY : derivePlay(profile);
}

/** The active ColorProfile, falling back to the default theme until hydration so the server and first client render match. */
export function useActiveProfile(): ColorProfile {
  const profile = useThemeStore(selectActiveProfile);
  const hydrated = useHydrated();
  return hydrated ? profile : themes[0];
}

/** Play-screen tokens for the active palette. */
export function usePlayTokens(): PlayTokens {
  const profile = useActiveProfile();
  return useMemo(() => playTokensFor(profile), [profile]);
}
