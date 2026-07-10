import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { QuizAttempt } from '@/lib/types';

/**
 * Appends a completed QuizAttempt to quizAttempts/{userId}/attempts/{autoId}.
 *
 * Append-only by design (addDoc, not set()) — a deliberate deviation from the
 * Flutter app's writeData(), which overwrote a single doc keyed by userId.
 *
 * Every field written here comes straight from QuizAttempt/QuestionLog
 * (lib/types.ts) — no extra fields (score, userId, correctCount, etc.) are
 * added. userId is the collection path segment, not a document field; the
 * Flutter app's writeData() didn't persist score/correctCount either, so
 * omitting them here isn't a regression.
 *
 * @returns the new document's autoId.
 */
export async function submitQuizAttempt(userId: string, attempt: QuizAttempt): Promise<string> {
  if (!userId) {
    throw new Error('Cannot save results: no student ID is set.');
  }

  const attemptsRef = collection(db, 'quizAttempts', userId, 'attempts');
  const docRef = await addDoc(attemptsRef, {
    startTime: Timestamp.fromDate(attempt.startTime),
    submissionTime: Timestamp.fromDate(attempt.submissionTime),
    difficulty: attempt.difficulty,
    questions: attempt.questions,
  });
  return docRef.id;
}
