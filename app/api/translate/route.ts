import { NextRequest, NextResponse } from 'next/server';
import { googleFreeProvider } from '@/lib/translation/providers/googleFreeProvider';
import type { TranslationProvider } from '@/lib/translation/types';

export const runtime = 'nodejs';

// Swap providers here — the only place that needs to change to go from free
// to paid. lib/translation/translateText.ts and every call site are unaffected.
const provider: TranslationProvider = googleFreeProvider;


export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const text = body?.text;
  const targetLang = body?.targetLang;

  if (typeof text !== 'string' || text.trim().length === 0) {
    console.error('[api/translate] missing/empty text. Full body:', body);
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }
  if (typeof targetLang !== 'string' || targetLang.trim().length === 0) {
    console.error('[api/translate] missing/empty targetLang. Full body:', body);
    return NextResponse.json({ error: 'targetLang is required' }, { status: 400 });
  }

  try {
    const translated = await provider.translate(text, targetLang);
    return NextResponse.json({ translated });
  } catch (err) {
    console.error('[api/translate] provider.translate threw:', err);
    return NextResponse.json({ error: 'Translation failed' }, { status: 502 });
  }
}