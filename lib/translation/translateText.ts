/**
 * Public, provider-agnostic translation entry point. Every call site (translate
 * button, future hover-translate) goes through this function — it never needs
 * to change when the backing provider changes, only app/api/translate/route.ts does.
 *
 * Routed through a server-side API route rather than called directly: the
 * underlying free provider (google-translate-api-x) doesn't work from the
 * browser (Google's endpoint blocks cross-origin requests).
 */
export async function translateText(text: string, targetLang: string): Promise<string> {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, targetLang }),
  });

  if (!res.ok) {
    throw new Error('Translation failed');
  }

  const data: { translated: string } = await res.json();
  return data.translated;
}
