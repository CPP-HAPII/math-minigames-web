import translate from 'google-translate-api-x';
import type { TranslationProvider } from '../types';

/**
 * Free provider — an unofficial Google Translate wrapper, mirroring the
 * Flutter reference's TranslationService (package:translator's GoogleTranslator).
 * No API key; hits Google's public translate endpoint under the hood via
 * google-translate-api-x. Node-only (CORS blocks it from the browser), so
 * this must run server-side — see app/api/translate/route.ts.
 *
 * Retries with backoff: this endpoint is unofficial and unauthenticated, so
 * transient failures (throttling, brief blocks) are expected in normal use,
 * not just under heavy load — a single failed attempt isn't reliable
 * evidence the request is actually bad.
 */
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const googleFreeProvider: TranslationProvider = {
  async translate(text, targetLang) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const result = await translate(text, { to: targetLang });
        return Array.isArray(result) ? result[0].text : result.text;
      } catch (err) {
        lastError = err;
        if (attempt < MAX_ATTEMPTS) {
          // Exponential backoff: 400ms, 800ms — brief enough not to stall the
          // UI badly, long enough to ride out a short-lived block.
          await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
        }
      }
    }

    console.error('[googleFreeProvider] translate failed after retries:', lastError);
    throw lastError instanceof Error ? lastError : new Error('Translation failed after retries');
  },
};