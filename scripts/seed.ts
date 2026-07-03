/**
 * scripts/seed.ts
 *
 * One-time Firestore seed.  Reads the two reference JSON files, applies the
 * transformations listed below, then writes two documents:
 *   gameData/questions   { questions: [...] }
 *   gameData/sequenceDoc { sequences: [...] }
 *
 * Transformations applied to each question:
 *   • Bakes in an explicit `score` field where missing (per-type defaults).
 *   • Renames `addtionalInstructions` → `additionalInstructions` (typo fix).
 *   Questions are otherwise uploaded as-is (PascalCase gameType, flat
 *   multiAcceptedAnswers, etc.) — normalisation happens at read time in the store.
 *
 * Run from the math-minigames-web project root (after filling in .env.local):
 *   npx tsx scripts/seed.ts
 */

// ─── 1. Non-Firebase imports (static — safe to hoist) ────────────────────────
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { resolveQuestionTypeKey } from '@/lib/normalize';

// ─── 2. Load .env.local SYNCHRONOUSLY before any Firebase code runs ───────────
// Static imports are hoisted and execute before this module body, but because
// firebase/* is only dynamically imported inside main() below, dotenv.config()
// is guaranteed to populate process.env before initializeApp() is called.
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// ─── 3. Per-type score defaults (matches Dart fromFirestore defaults) ─────────
const SCORE_DEFAULTS: Record<string, number> = {
  jumble:   10,
  playback: 25,
  reading:  30,
  typing:   20,
  fill:     15,
};

// ─── 4. Seed paths ────────────────────────────────────────────────────────────
const QUESTIONS_PATH  = resolve(process.cwd(), '../MathMinigamesV2/FirestoreDB/questions.json');
const SEQUENCE_PATH   = resolve(process.cwd(), '../MathMinigamesV2/FirestoreDB/sequenceDoc.json');

// ─── 5. Helpers ───────────────────────────────────────────────────────────────

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(
      `Missing env var ${key}.\n` +
      `Copy .env.local.example → .env.local and fill in your Firebase config.`,
    );
  }
  return val;
}

function processQuestion(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...raw };

  // Bake in score if absent
  if (!('score' in out)) {
    const typeKey = resolveQuestionTypeKey(out);
    out['score'] = SCORE_DEFAULTS[typeKey] ?? 10;
  }

  // Fix additionalInstructions typo: rename the misspelled key if present
  if ('addtionalInstructions' in out && !('additionalInstructions' in out)) {
    out['additionalInstructions'] = out['addtionalInstructions'];
    delete out['addtionalInstructions'];
  }

  return out;
}

// ─── 6. Main (Firebase loaded dynamically — AFTER dotenv) ────────────────────

async function main(): Promise<void> {
  // Validate env vars before touching Firebase
  const firebaseConfig = {
    apiKey:            requireEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
    authDomain:        requireEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
    projectId:         requireEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
    storageBucket:     requireEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: requireEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
    appId:             requireEnv('NEXT_PUBLIC_FIREBASE_APP_ID'),
  };

  // Dynamic imports run AFTER dotenv.config() has already executed
  const { initializeApp, getApps, getApp } = await import('firebase/app');
  const { getFirestore, doc, setDoc }       = await import('firebase/firestore');

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const db  = getFirestore(app);

  // ── Load source JSON files ──────────────────────────────────────────────────
  const rawQuestions = JSON.parse(
    readFileSync(QUESTIONS_PATH, 'utf-8'),
  ) as Record<string, unknown>[];

  const rawSequenceDoc = JSON.parse(
    readFileSync(SEQUENCE_PATH, 'utf-8'),
  ) as { sequences: Record<string, unknown>[] };

  // ── Process questions ───────────────────────────────────────────────────────
  const processed = rawQuestions.map(processQuestion);

  const originalNoScore = rawQuestions.filter((q) => !('score' in q)).length;
  const typoFixed    = rawQuestions.filter(
    (q) => 'addtionalInstructions' in q && !('additionalInstructions' in q),
  ).length;

  console.log(`\nProcessing ${rawQuestions.length} questions...`);
  console.log(`  Score baked in  : ${originalNoScore} questions`);
  console.log(`  Typo fixed      : ${typoFixed} questions`);

  // ── Upload gameData/questions ───────────────────────────────────────────────
  console.log('\nUploading gameData/questions...');
  await setDoc(doc(db, 'gameData', 'questions'), { questions: processed });
  console.log('  ✓ gameData/questions written');

  // ── Upload gameData/sequenceDoc ─────────────────────────────────────────────
  console.log('Uploading gameData/sequenceDoc...');
  await setDoc(doc(db, 'gameData', 'sequenceDoc'), {
    sequences: rawSequenceDoc.sequences,
  });
  console.log('  ✓ gameData/sequenceDoc written');

  console.log(`\n✅ Seed complete.`);
  console.log(`   Project: ${firebaseConfig.projectId}`);
  console.log(
    `   Questions: ${processed.length}  |  Sequences: ${rawSequenceDoc.sequences.length}\n`,
  );

  // The Firebase client SDK keeps a connection open; force exit when done.
  process.exit(0);
}

void main().catch((err: unknown) => {
  console.error('\n❌ Seed failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
