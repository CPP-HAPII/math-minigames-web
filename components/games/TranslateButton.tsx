'use client';

import type { ColorProfile } from '@/lib/themes';
import { useTranslation } from '@/lib/hooks/useTranslation';

interface TranslateButtonProps {
  /** The question text to translate — displayedProblem, or audioTranscript for Playback. */
  sourceText: string;
  profile: ColorProfile;
  /** Google Translate target-language code. Matches the Flutter reference's default. */
  targetLanguage?: string;
}

/**
 * Manual-trigger translate button + result text, shown unconditionally
 * regardless of assistLevel (per product decision — see Stage 12 report).
 * Ports the button-and-text half of the Flutter reference's
 * TranslateButtonAndText; the "Play translation" TTS half is out of scope
 * here (separate stage), so it isn't rendered.
 */
export default function TranslateButton({ sourceText, profile: p, targetLanguage = 'es' }: TranslateButtonProps) {
  const { status, translated, translate } = useTranslation(sourceText, targetLanguage);

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
      <button onClick={translate} disabled={status === 'loading'} style={button}>
        {status === 'loading' ? 'Translating…' : 'Translate'}
      </button>
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
