import { addDoc, collection, doc, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Difficulty, QuestionLog } from '@/lib/types';

/**
 * Creates the Firestore doc for a sublevel session as soon as it starts —
 * quizAttempts/{userId}/attempts/{autoId} — with an empty `questions` array.
 * updateQuizAttemptProgress() then fills it in as each question is answered.
 *
 * Written up front (rather than once at series completion) so a session the
 * student abandons partway through still leaves a real, queryable
 * QuestionAttemptRow[] behind — otherwise lib/services/progressService's
 * "in progress" detection could never see a sublevel that was started but
 * not finished, since nothing would exist in Firestore for it at all.
 *
 * @returns the new document's autoId, to pass into updateQuizAttemptProgress.
 */
export async function startQuizAttempt(userId: string, startTime: Date, difficulty: Difficulty): Promise<string> {
  if (!userId) {
    throw new Error('Cannot save results: no student ID is set.');
  }

  const attemptsRef = collection(db, 'quizAttempts', userId, 'attempts');
  const docRef = await addDoc(attemptsRef, {
    startTime: Timestamp.fromDate(startTime),
    // Placeholder until the first updateQuizAttemptProgress() call — kept
    // equal to startTime (rather than left absent) so a session that's
    // abandoned before a single question is answered still has a valid
    // Timestamp, matching the field's non-optional shape everywhere else.
    submissionTime: Timestamp.fromDate(startTime),
    difficulty,
    questions: [] as QuestionLog[],
  });
  return docRef.id;
}

/**
 * Overwrites `questions` (and refreshes `submissionTime` to now) on an
 * in-progress or just-completed attempt doc. Called after every answered
 * question — the same call handles an ordinary mid-series save and the
 * final save when the last question is answered; there's no separate
 * "finalize" step, since the last write already carries every QuestionLog.
 */
export async function updateQuizAttemptProgress(userId: string, attemptId: string, questions: QuestionLog[]): Promise<void> {
  if (!userId || !attemptId) return;
  const docRef = doc(db, 'quizAttempts', userId, 'attempts', attemptId);
  await updateDoc(docRef, {
    questions,
    submissionTime: Timestamp.fromDate(new Date()),
  });
}
