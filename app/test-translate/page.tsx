'use client';

/**
 * /test-translate — temporary harness (same pattern as /test-jumble) to
 * verify the Stage 12 translate button records an assist interaction that
 * actually lands in a QuestionLog via the real sessionStore.submitAnswer()
 * path. Exposes the accepted answer, option list, and last QuestionLog as
 * plain text so a Playwright script can drive + assert against them without
 * guessing at a randomly-selected question. Delete before production.
 */

import { useEffect } from 'react';
import { useGameDataStore } from '@/lib/stores/gameDataStore';
import { useAssistStore } from '@/lib/stores/assistStore';
import { useSessionStore } from '@/lib/stores/sessionStore';
import JumbleGame from '@/components/games/JumbleGame';

export default function TestTranslatePage() {
  const { initBanks, isLoaded, isLoading, error, jumbleBank } = useGameDataStore();
  const assistLevel = useAssistStore((s) => s.level);
  const questionLogs = useSessionStore((s) => s.questionLogs);
  const submitAnswer = useSessionStore((s) => s.submitAnswer);

  useEffect(() => {
    void initBanks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
