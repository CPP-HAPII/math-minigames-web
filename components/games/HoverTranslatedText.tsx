'use client';

import { useEffect, useRef, useState } from 'react';
import type { ColorProfile } from '@/lib/themes';
import { useHoverTranslation } from '@/lib/hooks/useHoverTranslation';

interface HoverTranslatedTextProps {
  text: string;
  enabled?: boolean;
  textAlign?: 'left' | 'center';
  profile: ColorProfile;
  targetLanguage?: string;
  fontSize?: string;
  /** Color for the problem text itself. Defaults to profile.contrastTextColor
   * if omitted; callers pass this explicitly to match whatever background
   * they're rendering the card against. */
  textColor?: string;
}

/** Splits into alternating non-whitespace / whitespace runs — same tokenization as the Dart `RegExp(r'\S+|\s+')`. */
const TOKEN_RE = /\S+|\s+/g;

/**
 * Tooltip colours: white inside with a purple border, matching the Language
 * Assist panel (same purple and ink as --assist-purple / --assist-ink in
 * TaskLayout.module.css), so it reads as part of the assist tools on every theme.
 */
const TOOLTIP = {
  background: '#ffffff',
  ink: '#3b2a8f',
  border: '#8b5cf6',
  shadow: 'rgba(139, 92, 246, 0.25)',
} as const;

/** How long the mouse must stay over a word before the tooltip appears — matches Tooltip.waitDuration in hover_translated_text.dart. */
const TOOLTIP_DELAY_MS = 150;

/**
 * Word-level hover-to-translate text. Ports hover_translated_text.dart:
 * scoped to jumble/typing/fill/reading's question text (the Flutter source
 * doesn't use this in Playback — audioTranscript is never shown as text
 * there, so there's nothing to hover). Reuses lib/translation/translateText()
 * via useHoverTranslation — same provider-agnostic pathway the Stage 12
 * translate button calls.
 */
export default function HoverTranslatedText(props: HoverTranslatedTextProps) {
  if (props.enabled === false) {
    return <p style={{ fontSize: props.fontSize ?? '1.6rem', margin: 0, fontWeight: 700, color: props.textColor ?? props.profile.contrastTextColor, textAlign: props.textAlign ?? 'center' }}>{props.text}</p>;
  }
  // Unmounting this child cancels its tooltip timer when translation is disabled.
  return <ActiveHoverText key={`${props.text}-${props.targetLanguage ?? 'es'}`} {...props} />;
}

function ActiveHoverText({ text, profile: p, targetLanguage = 'es', fontSize = '1.6rem', textColor, textAlign = 'center' }: HoverTranslatedTextProps) {
  const { translations, loadingWords, requestTranslation } = useHoverTranslation(targetLanguage);
  const [visibleTooltip, setVisibleTooltip] = useState<number | null>(null);
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current !== null) clearTimeout(tooltipTimeoutRef.current);
    };
  }, []);

  function handleEnter(index: number, word: string) {
    requestTranslation(word); // starts immediately, independent of the tooltip's own display delay
    if (tooltipTimeoutRef.current !== null) clearTimeout(tooltipTimeoutRef.current);
    tooltipTimeoutRef.current = setTimeout(() => setVisibleTooltip(index), TOOLTIP_DELAY_MS);
  }

  function handleLeave(index: number) {
    if (tooltipTimeoutRef.current !== null) clearTimeout(tooltipTimeoutRef.current);
    setVisibleTooltip((current) => (current === index ? null : current));
  }

  const tokens = text.match(TOKEN_RE) ?? [];

  return (
    <p style={{ fontSize, margin: 0, fontWeight: 700, color: textColor ?? p.contrastTextColor, textAlign }}>
      {tokens.map((token, i) => {
        if (token.trim().length === 0) return <span key={i}>{token}</span>;

        const tooltipMessage = translations[token] ?? (loadingWords.has(token) ? 'Translating…' : 'Hover to translate');

        return (
          <span
            key={i}
            data-hover-word={token}
            style={{ position: 'relative', cursor: 'help' }}
            onMouseEnter={() => handleEnter(i, token)}
            onMouseLeave={() => handleLeave(i)}
          >
            {token}
            {visibleTooltip === i && (
              <span
                role="tooltip"
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginBottom: '0.55rem',
                  backgroundColor: TOOLTIP.background,
                  color: TOOLTIP.ink,
                  border: `2px solid ${TOOLTIP.border}`,
                  boxShadow: `0 4px 12px ${TOOLTIP.shadow}`,
                  padding: '0.3rem 0.75rem',
                  borderRadius: '0.6rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  lineHeight: 1.4,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  zIndex: 10,
                }}
              >
                {tooltipMessage}
                {/* Small pointer under the bubble, aimed at the word. */}
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    width: '10px',
                    height: '10px',
                    marginTop: '-5px',
                    background: TOOLTIP.background,
                    borderRight: `2px solid ${TOOLTIP.border}`,
                    borderBottom: `2px solid ${TOOLTIP.border}`,
                    transform: 'translateX(-50%) rotate(45deg)',
                  }}
                />
              </span>
            )}
          </span>
        );
      })}
    </p>
  );
}
