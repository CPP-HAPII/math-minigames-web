import { useCallback, useState } from 'react';
import { translateText } from '@/lib/translation/translateText';
import { useSessionStore } from '@/lib/stores/sessionStore';

/**
 * Minimal translate-on-demand controller for the translate button.
 * Scoped to Stage 12: manual trigger only, no hover-translate, no TTS
 * playback of the result — those are separate stages (HoverTranslatedText,
 * Stage 13; "Play translation" TTS, a later stage).
 */

export type TranslationStatus = 'idle' | 'loading' | 'shown' | 'error';

export interface TranslationController {
  status: TranslationStatus;
  translated: string | null;
  translate: () => void;
}

export function useTranslation(sourceText: string, targetLang: string): TranslationController {
  const [status, setStatus] = useState<TranslationStatus>('idle');
  const [translated, setTranslated] = useState<string | null>(null);
  const recordAssistInteraction = useSessionStore((s) => s.recordAssistInteraction);

  const translate = useCallback(() => {
    if (status === 'loading') return;
    setStatus('loading');
    translateText(sourceText, targetLang)
      .then((result) => {
        setTranslated(result);
        setStatus('shown');
        // Mirrors game_page.dart's recordAssistUsage(intermediate, 'translation_displayed').
        recordAssistInteraction('translation_displayed', 'intermediate');
      })
      .catch(() => {
        setStatus('error');
      });
  }, [status, sourceText, targetLang, recordAssistInteraction]);

  return { status, translated, translate };
}
