import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { parseQuestion } from '@/lib/normalize';
import type { AnyGameData } from '@/lib/types';

/**
 * Fetches and parses the full question bank from gameData/questions,
 * independent of useGameDataStore (Zustand) so it can be called from scripts
 * or server-side code, not just client components. Mirrors gameDataStore's
 * own parse loop but returns a single flat AnyGameData[] instead of
 * distributing into per-type/per-difficulty banks — that's the shape
 * lib/services/progressService.ts needs to join QuestionAttemptRow.questionId
 * against each question's level/sublevel.
 */
export async function fetchQuestionBank(): Promise<AnyGameData[]> {
  const snap = await getDoc(doc(db, 'gameData', 'questions'));
  if (!snap.exists()) return [];

  const rawArr = snap.data()['questions'];
  if (!Array.isArray(rawArr)) return [];

  const bank: AnyGameData[] = [];
  for (const rawDoc of rawArr) {
    const parsed = parseQuestion(rawDoc as Record<string, unknown>);
    if (parsed) bank.push(parsed);
  }
  return bank;
}
