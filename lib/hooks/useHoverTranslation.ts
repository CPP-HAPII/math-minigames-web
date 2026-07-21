import { useCallback, useState } from 'react';
import { translateText } from '@/lib/translation/translateText';
import { useSessionStore } from '@/lib/stores/sessionStore';

/**
 * Word-level translate-on-hover controller, reusing the same
 * lib/translation/translateText() entry point as the Stage 12 translate
 * button — no second translation pathway.
 *
 * Ports _HoverTranslatedTextState from hover_translated_text.dart: a per-word
 * cache (translations) and in-flight set (loadingWords) so hovering the same
 * word again — or hovering a repeated occurrence of it elsewhere in the text
 * — never re-fires the API call once it's cached or already in flight. This
 * is the debouncing the word-hover UX needs: mouse movement within a single
 * word doesn't re-trigger onMouseEnter, and re-entering an already
 * cached/loading word is a no-op here.
 */

export interface HoverTranslationController {
  translations: Record<string, string>;
  loadingWords: Set<string>;
  /** Call on hover-enter for a word. No-ops if already cached or in flight. */
  requestTranslation: (word: string) => void;
}

export function useHoverTranslation(targetLang: string): HoverTranslationController {
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loadingWords, setLoadingWords] = useState<Set<string>>(new Set());
  const recordAssistInteraction = useSessionStore((s) => s.recordAssistInteraction);

  const requestTranslation = useCallback(
    (word: string) => {
      if (translations[word] !== undefined || loadingWords.has(word)) return;

      // Mirrors the Dart onTranslationHover callback: fires once per distinct
      // word, at request-start — not gated on the translation succeeding.
      recordAssistInteraction('hover_translation', 'advanced');
      setLoadingWords((prev) => new Set(prev).add(word));

      translateText(word, targetLang)
        .then((translated) => {
          setTranslations((prev) => ({ ...prev, [word]: translated }));
          setLoadingWords((prev) => {
            const next = new Set(prev);
            next.delete(word);
            return next;
          });
        })
        .catch(() => {
          // hover_translated_text.dart has no .catchError — a failed hover
          // lookup just stays stuck on "Translating...". Clearing loading
          // here instead so a failed word can be retried on the next hover,
          // rather than porting that dead-end.
          setLoadingWords((prev) => {
            const next = new Set(prev);
            next.delete(word);
            return next;
          });
        });
    },
    [translations, loadingWords, targetLang, recordAssistInteraction],
  );

  return { translations, loadingWords, requestTranslation };
}
