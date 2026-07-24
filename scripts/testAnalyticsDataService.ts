/**
 * scripts/testAnalyticsDataService.ts
 *
 * Exercises lib/services/analyticsDataService.ts against real Firestore data
 * (previous smoke-test runs already left real quizAttempts/{userId}/attempts
 * docs behind, e.g. under 'stage13-smoke') to confirm both fetch functions
 * return real, correctly-flattened rows.
 *
 * Run from the math-minigames-web project root:
 *   npx tsx scripts/testAnalyticsDataService.ts [userId]
 *
 * userId defaults to 'stage13-smoke' (has 3 real Jumble attempts from the
 * Stage 13 hover-translate smoke test). Pass a different userId to check
 * another student's data.
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const userId = process.argv[2] ?? 'stage13-smoke';

  // Dynamic import so dotenv.config() above runs before lib/firebase.ts
  // (transitively pulled in by analyticsDataService.ts) reads process.env
  // at module-load time — same reasoning as scripts/seed.ts.
  const { fetchStudentQuestionRows, fetchAllQuestionRows } = await import(
    '../lib/services/analyticsDataService'
  );

  // ── 1. Single-student fetch ─────────────────────────────────────────────
  console.log(`\n=== fetchStudentQuestionRows('${userId}') ===`);
  const studentRows = await fetchStudentQuestionRows(userId);
  console.log(`${studentRows.length} row(s):`);
  console.log(JSON.stringify(studentRows, null, 2));

  if (studentRows.length === 0) {
    console.warn(
      `\nNo rows found for '${userId}'. Run one of the scripts/smoke-*.mjs ` +
        `scripts (or play a series in the app) first to generate real data.`,
    );
  }

  // ── 2. Class-wide fetch (collectionGroup) ───────────────────────────────
  console.log(`\n=== fetchAllQuestionRows() ===`);
  const allRows = await fetchAllQuestionRows();
  const distinctUsers = new Set(allRows.map((r) => r.userId));
  console.log(`${allRows.length} row(s) across ${distinctUsers.size} distinct student(s): ${[...distinctUsers].join(', ')}`);

  // Sanity check: every row from the single-student fetch should also
  // appear (same attemptId + questionId) in the class-wide fetch.
  const allKey = new Set(allRows.map((r) => `${r.attemptId}:${r.questionId}`));
  const missing = studentRows.filter((r) => !allKey.has(`${r.attemptId}:${r.questionId}`));
  console.log(
    missing.length === 0
      ? `\nPASS — all ${studentRows.length} of '${userId}'s rows are present in the class-wide fetch.`
      : `\nFAIL — ${missing.length} of '${userId}'s rows are missing from the class-wide fetch: ${JSON.stringify(missing)}`,
  );

  process.exit(missing.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('FAILED:', e.message ?? e);
  process.exit(1);
});
