import { collection, collectionGroup, getDocs, Timestamp } from 'firebase/firestore';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AssistLevel, QuestionLog } from '@/lib/types';

/**
 * One flattened row per question attempt — the raw unit any future
 * aggregation (per-student, per-skill, per-assist-level, etc.) will group or
 * filter over. Combines a QuestionLog with the context that only exists at
 * its parent QuizAttempt/path level and would otherwise be lost by reading
 * QuestionLog alone: userId (the quizAttempts/{userId} path segment — never
 * stored inside the question map itself), attemptId + submissionTime +
 * difficulty (fields on the parent QuizAttempt document).
 */
export interface QuestionAttemptRow {
  userId: string;
  attemptId: string;
  submissionTime: Date;
  difficulty: string;
  questionId: string;
  skills: string[];
  result: boolean;
  timeTakenInSeconds: number;
  assistUsed: AssistLevel | null;
  assistInteractions: string[];
}

const VALID_ASSIST_LEVELS: readonly AssistLevel[] = ['novice', 'intermediate', 'advanced'];

function coerceAssistUsed(value: unknown): AssistLevel | null {
  return VALID_ASSIST_LEVELS.includes(value as AssistLevel) ? (value as AssistLevel) : null;
}

/**
 * Flattens one quizAttempts/{userId}/attempts/{attemptId} document into its
 * QuestionAttemptRow[]. Defensive against a missing/malformed `questions`
 * field or field — matches gameDataStore's tolerance for malformed Firestore
 * docs — because nothing at read time enforces the QuizAttempt/QuestionLog
 * shape; submitQuizAttempt() is the only writer today, but nothing stops a
 * hand-edited or partially-written doc from reaching this reader later.
 */
export function flattenAttemptDoc(
  userId: string,
  snap: QueryDocumentSnapshot<DocumentData>,
): QuestionAttemptRow[] {
  const data = snap.data();

  const submissionTime = data.submissionTime instanceof Timestamp ? data.submissionTime.toDate() : null;
  if (submissionTime === null) {
    console.warn(`[analyticsDataService] ${snap.ref.path}: missing/invalid submissionTime, defaulting to epoch.`);
  }

  const difficulty = typeof data.difficulty === 'string' ? data.difficulty : '';
  const questions: unknown[] = Array.isArray(data.questions) ? data.questions : [];
  if (!Array.isArray(data.questions)) {
    console.warn(`[analyticsDataService] ${snap.ref.path}: 'questions' is missing or not an array.`);
  }

  return questions.map((raw): QuestionAttemptRow => {
    const q = (raw ?? {}) as Partial<QuestionLog>;
    return {
      userId,
      attemptId: snap.id,
      submissionTime: submissionTime ?? new Date(0),
      difficulty,
      questionId: String(q.questionId ?? ''),
      skills: Array.isArray(q.skills) ? q.skills.map(String) : [],
      result: q.result === true,
      timeTakenInSeconds: typeof q.timeTakenInSeconds === 'number' ? q.timeTakenInSeconds : 0,
      assistUsed: coerceAssistUsed(q.assistUsed),
      assistInteractions: Array.isArray(q.assistInteractions) ? q.assistInteractions.map(String) : [],
    };
  });
}

/**
 * All question-attempt rows for one student, across every QuizAttempt
 * they've ever submitted. A direct subcollection read — cheap and exact,
 * since quizAttempts/{userId}/attempts is scoped to that one student already.
 */
export async function fetchStudentQuestionRows(userId: string): Promise<QuestionAttemptRow[]> {
  if (!userId) return [];
  const attemptsRef = collection(db, 'quizAttempts', userId, 'attempts');
  const snap = await getDocs(attemptsRef);
  return snap.docs.flatMap((doc) => flattenAttemptDoc(userId, doc));
}

/**
 * All question-attempt rows across every student, for class-wide views.
 *
 * There is no top-level index of student userIds anywhere in this data
 * model — userId is a free-typed 3-digit string at login (app/page.tsx),
 * never registered server-side — so the only way to enumerate "every
 * student" without a schema change is Firestore's collectionGroup query: it
 * matches every subcollection named 'attempts' regardless of parent, and the
 * parent document's id (snap.ref.parent.parent.id) recovers the userId. This
 * is safe today only because 'attempts' is used as a subcollection name
 * exactly once in this codebase (grep-confirmed against quizAttemptService.ts,
 * the sole writer); if an unrelated feature later adds its own 'attempts'
 * subcollection elsewhere, this query will start silently pulling that in too.
 *
 * SCALE WARNING: reads every QuizAttempt document for every student on every
 * call — no filtering, no pagination, no date range. Fine for a
 * classroom-sized pilot; will need either (a) a materialized per-class index
 * collection, (b) date-range/pagination query constraints, or (c) moving
 * aggregation server-side (Cloud Function / scheduled rollup) before this
 * scales past a few hundred students' worth of attempt history.
 */
export async function fetchAllQuestionRows(): Promise<QuestionAttemptRow[]> {
  const snap = await getDocs(collectionGroup(db, 'attempts'));
  return snap.docs.flatMap((doc) => {
    const userId = doc.ref.parent.parent?.id ?? '';
    if (!userId) {
      console.warn(`[analyticsDataService] ${doc.ref.path}: could not resolve parent userId, skipping.`);
      return [];
    }
    return flattenAttemptDoc(userId, doc);
  });
}
