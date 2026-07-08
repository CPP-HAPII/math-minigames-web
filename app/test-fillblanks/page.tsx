'use client';

/**
 * /test-fillblanks — temporary harness to play a real Fill question end-to-end.
 * Pulls questions from gameDataStore (Firestore) and logs onComplete to the console.
 * Delete before production.
 *
 * Prereqs: filled-in .env.local, `npx tsx scripts/seed.ts`, `npm run dev`.
 */

import { useEffect, useState } from 'react';
import { useGameDataStore } from '@/lib/stores/gameDataStore';
import { useAssistStore } from '@/lib/stores/assistStore';
import FillBlanksGame from '@/components/games/FillBlanksGame';

export default function TestFillBlanksPage() {
  const { initBanks, isLoaded, isLoading, error, fillBlanksBank } = useGameDataStore();
  const assistLevel = useAssistStore((s) => s.level);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    void initBanks();
    // initBanks is a stable Zustand action — safe to omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const question = fillBlanksBank[index];

  // Log the blank form + accepted answers so the tester knows what to pick.
  useEffect(() => {
    if (question) {
      console.log(
        `[test-fillblanks] question ${index + 1}/${fillBlanksBank.length} · id=${question.id}\n` +
          `  blankForm: ${question.blankForm}\n` +
          `  options:   ${JSON.stringify(question.optionList)}\n` +
          `  accepted:  ${JSON.stringify(question.multiAcceptedAnswers)}`,
      );
    }
  }, [question, index, fillBlanksBank.length]);

  if (isLoading) {
    return <main style={{ fontFamily: 'monospace', padding: '2rem' }}>⏳ Loading from Firestore…</main>;
  }
  if (error) {
    return (
      <main style={{ fontFamily: 'monospace', padding: '2rem', color: 'crimson' }}>
        <h2>❌ Error</h2>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{error}</pre>
      </main>
    );
  }
  if (!isLoaded) {
    return <main style={{ fontFamily: 'monospace', padding: '2rem' }}>Waiting to load…</main>;
  }
  if (!question) {
    return <main style={{ fontFamily: 'monospace', padding: '2rem' }}>No Fill questions found in the bank.</main>;
  }

  return (
    <main>
      <div style={{ fontFamily: 'monospace', padding: '0.75rem 1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid #ccc' }}>
        <span>
          test-fillblanks · question {index + 1}/{fillBlanksBank.length} · id=<strong>{question.id}</strong> · assist=<strong>{assistLevel}</strong>
        </span>
        <button
          onClick={() => setIndex((i) => (i + 1) % fillBlanksBank.length)}
          style={{ padding: '0.35rem 0.9rem', cursor: 'pointer' }}
        >
          Next question →
        </button>
        <span style={{ color: '#666' }}>(onComplete logs to the browser console)</span>
      </div>

      <FillBlanksGame
        // Remount per question → resets the timer and hadMistake flag in useGameBase.
        key={question.id}
        question={question}
        assistLevel={assistLevel}
        onComplete={(wasCorrect) =>
          console.log('[test-fillblanks] onComplete →', { id: question.id, wasCorrect })
        }
      />
    </main>
  );
}
