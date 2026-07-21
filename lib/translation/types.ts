/**
 * Provider-agnostic translation contract. Swapping providers (free → paid)
 * means writing a new TranslationProvider and pointing app/api/translate/route.ts
 * at it — lib/translation/translateText.ts and every call site stay unchanged.
 */
export interface TranslationProvider {
  translate(text: string, targetLang: string): Promise<string>;
}
