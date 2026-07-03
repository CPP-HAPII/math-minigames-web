/**
 * scripts/validateQuestions.ts
 *
 * Validates every question in the Flutter reference repo's seed file against the
 * TypeScript data model and normalisation functions.
 *
 * Run from the math-minigames-web project root:
 *   npx tsx scripts/validateQuestions.ts
 *
 * Exit 0 → all questions parsed cleanly.
 * Exit 1 → one or more questions failed; details printed to stdout.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  resolveQuestionTypeKey,
  normalizeNestedAnswers,
  normalizeToStringList,
  parseQuestion,
} from '@/lib/normalize';
import type {
  AnyGameData,
  FillBlanksGameData,
  JumbleGameData,
  PlaybackGameData,
  ReadAloudGameData,
  TypingGameData,
} from '@/lib/types';

// ─── Load JSON ────────────────────────────────────────────────────────────────

const QUESTIONS_PATH = resolve(
  process.cwd(),
  '../MathMinigamesV2/FirestoreDB/questions.json',
);

const raw: unknown = JSON.parse(readFileSync(QUESTIONS_PATH, 'utf-8'));

if (!Array.isArray(raw)) {
  console.error('ERROR: questions.json root is not an array.');
  process.exit(1);
}

const docs = raw as Record<string, unknown>[];

// ─── Parse every question ─────────────────────────────────────────────────────

type Success = { ok: true; id: string; typeKey: string; parsed: AnyGameData };
type Failure = { ok: false; id: string; typeKey: string; reason: string };
type Result = Success | Failure;

function validate(doc: Record<string, unknown>): Result {
  const id = String(doc['id'] ?? '(no id)');
  const typeKey = resolveQuestionTypeKey(doc);

  if (!typeKey) {
    return {
      ok: false,
      id,
      typeKey: '(unresolved)',
      reason: 'resolveQuestionTypeKey returned empty string — no matching type found',
    };
  }

  const parsed = parseQuestion(doc);
  if (parsed === null) {
    return { ok: false, id, typeKey, reason: 'parseQuestion returned null' };
  }

  const errors: string[] = [];

  // ── Common field checks ────────────────────────────────────────────────────
  if (!parsed.id) errors.push('id is empty');
  if (parsed.skills.length === 0) errors.push('skills is empty');

  // ── Type-specific structural checks ───────────────────────────────────────
  switch (parsed.gameType) {
    case 'jumble':
    case 'playback':
    case 'reading': {
      // Must be nested (string[][])
      const nested = (parsed as JumbleGameData | PlaybackGameData | ReadAloudGameData)
        .multiAcceptedAnswers;
      if (nested.length === 0) {
        errors.push('multiAcceptedAnswers is empty');
      } else {
        if (!Array.isArray(nested[0])) {
          errors.push(
            'multiAcceptedAnswers[0] is not an array — expected string[][], got string[]',
          );
        }
        if (nested[0].length === 0) {
          errors.push('multiAcceptedAnswers[0] is an empty array');
        }
      }
      // optionList required for jumble and playback
      if (parsed.gameType === 'jumble' || parsed.gameType === 'playback') {
        const opts = (parsed as JumbleGameData | PlaybackGameData).optionList;
        if (opts.length === 0) errors.push('optionList is empty');
      }
      break;
    }

    case 'typing': {
      // Must be flat (string[])
      const flat = (parsed as TypingGameData).multiAcceptedAnswers;
      if (flat.length === 0) {
        errors.push('multiAcceptedAnswers is empty');
      } else if (Array.isArray(flat[0])) {
        errors.push(
          'multiAcceptedAnswers[0] is an array — typing must use string[], not string[][]',
        );
      }
      break;
    }

    case 'fill': {
      // Must be flat (string[])
      const flat = (parsed as FillBlanksGameData).multiAcceptedAnswers;
      if (flat.length === 0) {
        errors.push('multiAcceptedAnswers is empty');
      } else if (Array.isArray(flat[0])) {
        errors.push(
          'multiAcceptedAnswers[0] is an array — fill must use string[], not string[][]',
        );
      }
      if (!(parsed as FillBlanksGameData).blankForm) {
        errors.push('blankForm is empty or missing');
      }
      break;
    }
  }

  if (errors.length > 0) {
    return { ok: false, id, typeKey, reason: errors.join('; ') };
  }

  return { ok: true, id, typeKey, parsed };
}

const results: Result[] = docs.map(validate);

// ─── Summarise ────────────────────────────────────────────────────────────────

const successes = results.filter((r): r is Success => r.ok);
const failures = results.filter((r): r is Failure => !r.ok);

const byType: Record<string, number> = {};
for (const r of successes) {
  byType[r.typeKey] = (byType[r.typeKey] ?? 0) + 1;
}

const TOTAL = docs.length;
console.log(`\nLoaded ${TOTAL} questions from:`);
console.log(`  ${QUESTIONS_PATH}\n`);

console.log(`Parsed OK : ${successes.length} / ${TOTAL}`);
console.log(`Failed    : ${failures.length} / ${TOTAL}`);

console.log('\nType breakdown:');
for (const [type, count] of Object.entries(byType).sort()) {
  console.log(`  ${type.padEnd(12)} ${count}`);
}

// ─── Schema observations ──────────────────────────────────────────────────────

console.log('\n── Schema observations ──────────────────────────────────────────');

// 1. Missing 'score' field (defaults applied)
const noScore = docs.filter((d) => !('score' in d));
if (noScore.length > 0) {
  console.log(
    `\n⚠  ${noScore.length}/${TOTAL} questions have no 'score' field — per-type defaults applied:`,
  );
  console.log('   jumble=10  playback=25  reading=30  typing=20  fill=15');
}

// 2. Typo variant of additionalInstructions
const typoField = docs.filter(
  (d) => 'addtionalInstructions' in d && !('additionalInstructions' in d),
);
const bothFields = docs.filter(
  (d) => 'addtionalInstructions' in d && 'additionalInstructions' in d,
);
if (typoField.length > 0) {
  console.log(
    `\n⚠  ${typoField.length} ReadAloud question(s) use the misspelled key 'addtionalInstructions':`,
  );
  for (const d of typoField) console.log(`   [${String(d['id'])}]`);
  console.log('   parseReadAloud() handles both via fallback ✓');
}
if (bothFields.length > 0) {
  console.log(
    `\nℹ  ${bothFields.length} ReadAloud question(s) have BOTH spellings — 'additionalInstructions' takes priority`,
  );
}

// 3. gameType PascalCase in JSON
const upperGameType = docs.filter((d) => {
  const gt = String(d['gameType'] ?? '');
  return gt !== gt.toLowerCase();
});
if (upperGameType.length > 0) {
  const sample = upperGameType.slice(0, 3).map((d) => `"${String(d['gameType'])}"`).join(', ');
  console.log(
    `\nℹ  ${upperGameType.length}/${TOTAL} questions have non-lowercase 'gameType' (e.g. ${sample})`,
  );
  console.log('   resolveQuestionTypeKey lowercases before matching ✓');
}

// 4. Playback questions with a real webAudioLink (non-empty)
const withAudio = successes
  .filter((r) => r.typeKey === 'playback')
  .filter((r) => (r.parsed as PlaybackGameData).webAudioLink !== '');
if (withAudio.length > 0) {
  console.log(
    `\nℹ  ${withAudio.length} Playback question(s) have a non-empty webAudioLink (HTML5 <audio>):`,
  );
  for (const r of withAudio) {
    console.log(
      `   [${r.id}] → "${(r.parsed as PlaybackGameData).webAudioLink}"`,
    );
  }
}

// 5. FillBlanks questions where multiAcceptedAnswers elements contain spaces
//    (e.g. "hundred thousands" — must stay flat, not be split)
const fillWithSpacedAnswers = successes
  .filter((r) => r.typeKey === 'fill')
  .filter((r) =>
    (r.parsed as FillBlanksGameData).multiAcceptedAnswers.some((a) =>
      /\s/.test(a),
    ),
  );
if (fillWithSpacedAnswers.length > 0) {
  console.log(
    `\nℹ  ${fillWithSpacedAnswers.length} FillBlanks question(s) have multi-word answers in multiAcceptedAnswers`,
  );
  console.log(
    '   (e.g. "hundred thousands") — these are stored via normalizeToStringList so they remain unsplit ✓',
  );
  for (const r of fillWithSpacedAnswers) {
    const fill = r.parsed as FillBlanksGameData;
    const spaced = fill.multiAcceptedAnswers.filter((a) => /\s/.test(a));
    console.log(`   [${r.id}] spaced answers: ${JSON.stringify(spaced)}`);
  }
}

// 6. Normalised shape spot-checks
console.log('\n── Spot-check: normalizeNestedAnswers on representative inputs ──');

const spotChecks: Array<{ label: string; input: unknown; expected: string }> = [
  {
    label: 'single phrase  ("She is forty years-old")',
    input: ['She is forty years-old'],
    expected: '[["She","is","forty","years-old"]]',
  },
  {
    label: 'two phrases    (jumble.4 style)',
    input: ['phrase one two', 'phrase three four'],
    expected: '[["phrase","one","two"],["phrase","three","four"]]',
  },
  {
    label: 'single tokens  (["six"])',
    input: ['six'],
    expected: '[["six"]]',
  },
  {
    label: 'JSON string    (\'["a b","c d"]\')',
    input: '["a b","c d"]',
    expected: '[["a","b"],["c","d"]]',
  },
];

let spotOk = 0;
for (const { label, input, expected } of spotChecks) {
  const result = JSON.stringify(normalizeNestedAnswers(input));
  const pass = result === expected;
  console.log(`  ${pass ? '✓' : '✗'} ${label}`);
  if (!pass) {
    console.log(`    expected: ${expected}`);
    console.log(`    got:      ${result}`);
  } else {
    spotOk++;
  }
}

console.log('\n── Spot-check: normalizeToStringList on representative inputs ───');

const flatChecks: Array<{ label: string; input: unknown; expected: string }> = [
  {
    label: 'flat phrases with spaces (fill.5 style)',
    input: ['hundred thousands', 'ten thousands', 'ones'],
    expected: '["hundred thousands","ten thousands","ones"]',
  },
  {
    label: 'single string answer',
    input: ['seven hundred and seventy nine'],
    expected: '["seven hundred and seventy nine"]',
  },
];

for (const { label, input, expected } of flatChecks) {
  const result = JSON.stringify(normalizeToStringList(input));
  const pass = result === expected;
  console.log(`  ${pass ? '✓' : '✗'} ${label}`);
  if (!pass) {
    console.log(`    expected: ${expected}`);
    console.log(`    got:      ${result}`);
  } else {
    spotOk++;
  }
}

// ─── Final verdict ────────────────────────────────────────────────────────────

if (failures.length > 0) {
  console.log('\n─── FAILURES ───────────────────────────────────────────────────');
  for (const f of failures) {
    console.log(`  ✗ [${f.id}] (${f.typeKey}): ${f.reason}`);
  }
  console.log(`\n❌ ${failures.length} question(s) failed validation.\n`);
  process.exit(1);
} else {
  console.log(
    `\n✅ All ${TOTAL} questions parsed and validated successfully.\n`,
  );
}
