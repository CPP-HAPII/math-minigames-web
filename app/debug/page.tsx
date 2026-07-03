'use client';

/**
 * /debug  — temporary page to confirm all 39 questions load from Firestore.
 * Delete or gate behind an env flag before production.
 *
 * Visit http://localhost:3000/debug after:
 *   1. Filling in .env.local
 *   2. Running `npx tsx scripts/seed.ts`
 *   3. Running `npm run dev`
 */

import { useEffect } from 'react';
import { useGameDataStore } from '@/lib/stores/gameDataStore';

interface BankRow {
  label: string;
  count: number;
}

export default function DebugPage() {
  const {
    initBanks,
    isLoaded,
    isLoading,
    error,
    jumbleBank,
    playbackBank,
    readAloudBank,
    typingBank,
    fillBlanksBank,
    easyBank,
    intermediateBank,
    hardBank,
    sequences,
  } = useGameDataStore();

  useEffect(() => {
    void initBanks();
  // initBanks is a stable Zustand action reference — safe to omit from deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <main style={{ fontFamily: 'monospace', padding: '2rem' }}>
        <p>⏳ Loading from Firestore…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ fontFamily: 'monospace', padding: '2rem', color: 'crimson' }}>
        <h2>❌ Error</h2>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{error}</pre>
        <p style={{ marginTop: '1rem', color: '#555' }}>
          Make sure you have filled in <code>.env.local</code> and run{' '}
          <code>npx tsx scripts/seed.ts</code>.
        </p>
      </main>
    );
  }

  if (!isLoaded) {
    return (
      <main style={{ fontFamily: 'monospace', padding: '2rem' }}>
        <p>Waiting to load…</p>
      </main>
    );
  }

  const totalQuestions =
    jumbleBank.length +
    playbackBank.length +
    readAloudBank.length +
    typingBank.length +
    fillBlanksBank.length;

  const typeRows: BankRow[] = [
    { label: 'jumble',    count: jumbleBank.length },
    { label: 'playback',  count: playbackBank.length },
    { label: 'readAloud', count: readAloudBank.length },
    { label: 'typing',    count: typingBank.length },
    { label: 'fill',      count: fillBlanksBank.length },
  ];

  const diffRows: BankRow[] = [
    { label: 'easy',         count: easyBank.length },
    { label: 'intermediate', count: intermediateBank.length },
    { label: 'hard',         count: hardBank.length },
  ];

  return (
    <main style={{ fontFamily: 'monospace', padding: '2rem', maxWidth: '560px' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>🗄 Firestore Data Debug</h1>
      <p style={{ color: '#555', marginBottom: '1.5rem' }}>
        Temporary page — remove before production.
      </p>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ borderBottom: '1px solid #ccc', paddingBottom: '0.25rem' }}>
          Questions by type
        </h2>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            {typeRows.map(({ label, count }) => (
              <tr key={label}>
                <td style={{ padding: '4px 8px', color: '#333' }}>{label}</td>
                <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                  <strong>{count}</strong>
                </td>
              </tr>
            ))}
            <tr style={{ borderTop: '1px solid #ccc' }}>
              <td style={{ padding: '4px 8px' }}>
                <strong>TOTAL</strong>
              </td>
              <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                <strong
                  style={{ color: totalQuestions === 39 ? 'green' : 'crimson' }}
                >
                  {totalQuestions}
                  {totalQuestions === 39 ? ' ✓' : ' ✗ (expected 39)'}
                </strong>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ borderBottom: '1px solid #ccc', paddingBottom: '0.25rem' }}>
          Questions by difficulty
        </h2>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            {diffRows.map(({ label, count }) => (
              <tr key={label}>
                <td style={{ padding: '4px 8px', color: '#333' }}>{label}</td>
                <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                  <strong>{count}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 style={{ borderBottom: '1px solid #ccc', paddingBottom: '0.25rem' }}>
          Sequences
        </h2>
        {sequences.length === 0 ? (
          <p style={{ color: '#888' }}>No sequences loaded.</p>
        ) : (
          <ul style={{ paddingLeft: '1.25rem', lineHeight: '1.8' }}>
            {sequences.map((s) => (
              <li key={s.name}>
                <strong>{s.name}</strong>{' '}
                <span style={{ color: '#666' }}>
                  [{s.difficulty.join(', ')}]
                  {s.filters.length > 0 ? ` · tags: ${s.filters.join(', ')}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
