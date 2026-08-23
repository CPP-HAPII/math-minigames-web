'use client';

/**
 * /test-translate — temporary harness (same pattern as /test-jumble) to
 * verify the Stage 12/13 translate button and hover-translate record assist
 * interactions that actually land in a QuestionLog via the real
 * sessionStore.submitAnswer() path — and, via the "Submit to Firestore"
 * button, that the resulting QuizAttempt actually persists. Exposes the
 * accepted answer, option list, last QuestionLog, and write status as plain
 * text so a Playwright script can drive + assert against them without
 * guessing at a randomly-selected question. Delete before production.
 */

import { useEffect, useState } from 'react';
import { useGameDataStore } from '@/lib/stores/gameDataStore';
import { useAssistStore } from '@/lib/stores/assistStore';
import { useSessionStore } from '@/lib/stores/sessionStore';
import { useUserStore } from '@/lib/stores/userStore';
import { startQuizAttempt, updateQuizAttemptProgress } from '@/lib/services/quizAttemptService';
import type { Difficulty } from '@/lib/types';
import JumbleGame from '@/components/games/JumbleGame';

export default function TestTranslatePage() {
  const { initBanks, isLoaded, isLoading, error, jumbleBank } = useGameDataStore();
  const assistLevel = useAssistStore((s) => s.level);
  const questionLogs = useSessionStore((s) => s.questionLogs);
  const submitAnswer = useSessionStore((s) => s.submitAnswer);
  const completeSeries = useSessionStore((s) => s.completeSeries);
  const userId = useUserStore((s) => s.userId);
  const [writeStatus, setWriteStatus] = useState('idle');

  useEffect(() => {
    void initBanks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmitToFirestore() {
    setWriteStatus('saving');
    try {
      const attempt = completeSeries();
      const docId = await startQuizAttempt(userId, attempt.startTime, attempt.difficulty as Difficulty);
      await updateQuizAttemptProgress(userId, docId, attempt.questions);
      setWriteStatus(`saved:${docId}`);
    } catch (e) {
      setWriteStatus(`error:${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (isLoading) return <main style={{ fontFamily: 'monospace', padding: '2rem' }}>Loading from Firestore…</main>;
  if (error) return <main style={{ fontFamily: 'monospace', padding: '2rem' }}>Error: {error}</main>;
  if (!isLoaded) return <main style={{ fontFamily: 'monospace', padding: '2rem' }}>Waiting to load…</main>;

  const question = jumbleBank[0];
  if (!question) return <main style={{ fontFamily: 'monospace', padding: '2rem' }}>No Jumble questions found.</main>;

  const lastLog = questionLogs[questionLogs.length - 1];

  return (
    <main>
      <div style={{ fontFamily: 'monospace', padding: '0.75rem 1rem', borderBottom: '1px solid #ccc' }}>
        <div data-testid="accepted-answer">{JSON.stringify(question.multiAcceptedAnswers[0])}</div>
        <div data-testid="option-list">{JSON.stringify(question.optionList)}</div>
        <div data-testid="last-log">{lastLog ? JSON.stringify(lastLog) : ''}</div>
        <button data-testid="submit-to-firestore" onClick={handleSubmitToFirestore}>
          Submit to Firestore
        </button>
        <div data-testid="write-status">{writeStatus}</div>
      </div>

      <JumbleGame
        key={question.id}
        question={question}
        assistLevel={assistLevel}
        onComplete={(wasCorrect) => submitAnswer(question, wasCorrect, 1)}
      />
    </main>
  );
}
