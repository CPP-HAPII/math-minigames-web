/**
 * scripts/testAnalyticsService.ts
 *
 * Fetches real QuestionAttemptRow data (via analyticsDataService) and runs
 * every pure computation in lib/services/analyticsService.ts against it, so
 * the numbers can be sanity-checked against real Firestore data before
 * committing.
 *
 * Run from the math-minigames-web project root:
 *   npx tsx scripts/testAnalyticsService.ts
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  // Dynamic import so dotenv.config() above runs before lib/firebase.ts
  // (transitively pulled in via analyticsDataService.ts) reads process.env —
  // same reasoning as scripts/seed.ts / testAnalyticsDataService.ts.
  const { fetchAllQuestionRows } = await import('../lib/services/analyticsDataService');
  const {
    computeSkillAccuracy,
    computeSkillAccuracyByStudent,
    detectWeakTopics,
    computeAssistUsageByStudent,
    computeInteractionTypeCounts,
    computeAverageTimeBySkill,
  } = await import('../lib/services/analyticsService');

  const rows = await fetchAllQuestionRows();
  const distinctUsers = new Set(rows.map((r) => r.userId));
  console.log(`Fetched ${rows.length} row(s) across ${distinctUsers.size} student(s): ${[...distinctUsers].join(', ')}\n`);

  if (rows.length === 0) {
    console.warn('No data found — run scripts/smoke-*.mjs or play a series in the app first.');
    process.exit(1);
  }

  console.log('=== computeSkillAccuracy (class-wide) ===');
  console.log(JSON.stringify(computeSkillAccuracy(rows), null, 2));

  console.log('\n=== computeSkillAccuracyByStudent ===');
  console.log(JSON.stringify(computeSkillAccuracyByStudent(rows), null, 2));

  console.log('\n=== detectWeakTopics(classAccuracy, 0.6) ===');
  console.log(JSON.stringify(detectWeakTopics(computeSkillAccuracy(rows), 0.6), null, 2));

  console.log('\n=== detectWeakTopics(perStudentAccuracy, 0.6) ===');
  console.log(JSON.stringify(detectWeakTopics(computeSkillAccuracyByStudent(rows), 0.6), null, 2));

  console.log('\n=== computeAssistUsageByStudent ===');
  console.log(JSON.stringify(computeAssistUsageByStudent(rows), null, 2));

  console.log('\n=== computeInteractionTypeCounts (class-wide) ===');
  console.log(JSON.stringify(computeInteractionTypeCounts(rows), null, 2));

  console.log('\n=== computeAverageTimeBySkill (class-wide) ===');
  console.log(JSON.stringify(computeAverageTimeBySkill(rows), null, 2));

  // ── Spot-check one student's timing in isolation, to confirm the same
  // function is genuinely scope-agnostic (same computeAverageTimeBySkill,
  // just pre-filtered rows). ──
  const sampleUserId = [...distinctUsers][0];
  console.log(`\n=== computeAverageTimeBySkill (single student: '${sampleUserId}') ===`);
  console.log(
    JSON.stringify(
      computeAverageTimeBySkill(rows.filter((r) => r.userId === sampleUserId)),
      null,
      2,
    ),
  );

  process.exit(0);
}

main().catch((e) => {
  console.error('FAILED:', e.message ?? e);
  process.exit(1);
});
