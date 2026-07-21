import translate from 'google-translate-api-x';
import type { TranslationProvider } from '../types';

/**
 * Free provider — an unofficial Google Translate wrapper, mirroring the
 * Flutter reference's TranslationService (package:translator's GoogleTranslator).
 * No API key; hits Google's public translate endpoint under the hood via
 * google-translate-api-x. Node-only (CORS blocks it from the browser), so
 * this must run server-side — see app/api/translate/route.ts.
 */
export const googleFreeProvider: TranslationProvider = {
  async translate(text, targetLang) {
    const result = await translate(text, { to: targetLang });
    return Array.isArray(result) ? result[0].text : result.text;
  },
};
