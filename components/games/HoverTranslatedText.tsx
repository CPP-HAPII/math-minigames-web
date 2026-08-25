'use client';

import { useEffect, useRef, useState } from 'react';
import type { ColorProfile } from '@/lib/themes';
import { useHoverTranslation } from '@/lib/hooks/useHoverTranslation';

interface HoverTranslatedTextProps {
  text: string;
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
export default function HoverTranslatedText({ text, profile: p, targetLanguage = 'es', fontSize = '1.6rem', textColor }: HoverTranslatedTextProps) {
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
    <p style={{ fontSize, margin: 0, fontWeight: 700, color: textColor ?? p.contrastTextColor, textAlign: 'center' }}>
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
                  marginBottom: '0.35rem',
                  backgroundColor: p.headerColor,
                  color: p.textColor,
                  padding: '0.25rem 0.6rem',
                  borderRadius: '0.4rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  zIndex: 10,
                }}
              >
                {tooltipMessage}
              </span>
            )}
          </span>
        );
      })}
    </p>
  );
}
