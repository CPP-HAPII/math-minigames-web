import { useCallback, useEffect, useState } from 'react';
import { translateText } from '@/lib/translation/translateText';
import { useSessionStore } from '@/lib/stores/sessionStore';
import { useSpeak } from '@/lib/hooks/useSpeak';

/**
 * Translate-on-demand controller for the translate button, extended for
 * Stage 15 (assist levels) with:
 *   - autoTranslate: fires translate() once on mount, mirroring
 *     TranslateButtonAndText's initState postFrameCallback in translation.dart
 *     (novice/"Full Assist" passes this true; intermediate/"Half Assist"
 *     leaves the trigger to the user's own Translate click).
 *   - speakTranslation: TTS-plays the current translation and logs it,
 *     mirroring _speak()'s onTranslationSpoken → recordAssistUsage(novice,
 *     'translation_heard') in translation.dart. Available regardless of the
 *     caller's assist level — same as the Dart source, where "Play
 *     translation" isn't itself gated by level.
 */

export type TranslationStatus = 'idle' | 'loading' | 'shown' | 'error';

export interface TranslationController {
  status: TranslationStatus;
  translated: string | null;
  translate: () => void;
  speakTranslation: () => void;
}

export function useTranslation(
  sourceText: string,
  targetLang: string,
  autoTranslate = false,
): TranslationController {
  const [status, setStatus] = useState<TranslationStatus>('idle');
  const [translated, setTranslated] = useState<string | null>(null);
  const recordAssistInteraction = useSessionStore((s) => s.recordAssistInteraction);
  const speak = useSpeak();

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

  // Fires once per mounted question, matching Dart's initState-only trigger —
  // never re-fires on rerender even though `translate` is recreated as
  // `status` changes. Kicking off async work on mount, same as any
  // fetch-on-mount effect; react-hooks/set-state-in-effect's synchronous-
  // derived-state concern doesn't apply here since translate()'s setState
  // calls are the mount-triggered fetch itself, not a derivation of props/state.
  /* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
  useEffect(() => {
    if (autoTranslate) translate();
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

  const speakTranslation = useCallback(() => {
    if (!translated) return;
    speak(translated, targetLang);
    recordAssistInteraction('translation_heard', 'novice');
  }, [translated, targetLang, speak, recordAssistInteraction]);

  return { status, translated, translate, speakTranslation };
}
