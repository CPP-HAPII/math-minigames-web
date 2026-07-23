'use client';

import type { ColorProfile } from '@/lib/themes';
import { useTranslation } from '@/lib/hooks/useTranslation';

interface TranslateButtonProps {
  /** The question text to translate — displayedProblem, or audioTranscript for Playback. */
  sourceText: string;
  profile: ColorProfile;
  /** Google Translate target-language code. Matches the Flutter reference's default. */
  targetLanguage?: string;
  /**
   * Fire translate() once on mount instead of waiting for a click — the
   * novice/"Full Assist" case. Callers are responsible for not rendering
   * this component at all for advanced/"Low Assist" (see the assist-card
   * gate at each game's callsite), matching the Dart
   * `if (assistLevel == novice || intermediate)` wrapper.
   */
  autoTranslate?: boolean;
}

/**
 * Manual/auto-trigger translate button + result text + "Play translation"
 * TTS, gated by the caller per assistLevel (see JumbleGame/etc.). Ports
 * TranslateButtonAndText from the Flutter reference in full: the Translate
 * button, the translated text, and the "Play translation" button, which
 * appears once a translation exists regardless of autoTranslate/assistLevel
 * (the Dart widget doesn't gate it either).
 */
export default function TranslateButton({
  sourceText,
  profile: p,
  targetLanguage = 'es',
  autoTranslate = false,
}: TranslateButtonProps) {
  const { status, translated, translate, speakTranslation } = useTranslation(sourceText, targetLanguage, autoTranslate);

  const button: React.CSSProperties = {
    backgroundColor: p.headerColor,
    color: p.contrastTextColor,
    border: 'none',
    borderRadius: '0.6rem',
    padding: '0.55rem 1.2rem',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: status === 'loading' ? 'not-allowed' : 'pointer',
    opacity: status === 'loading' ? 0.6 : 1,
  };

  return (
    <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={translate} disabled={status === 'loading'} style={button}>
          {status === 'loading' ? 'Translating…' : 'Translate'}
        </button>
        {status === 'shown' && translated && (
          <button onClick={speakTranslation} style={button}>
            Play translation
          </button>
        )}
      </div>
      {status === 'shown' && translated && (
        <p style={{ fontSize: '1rem', margin: '0.6rem 0 0', color: p.contrastTextColor }}>
          Translation: {translated}
        </p>
      )}
      {status === 'error' && (
        <p style={{ fontSize: '0.9rem', margin: '0.6rem 0 0', color: p.clearAnswerButtonColor }}>
          Translation failed — try again.
        </p>
      )}
    </div>
  );
}
