// Stage 5 placeholder — real game-series page comes in Stage 9.
// Reads difficulty + category from query params and displays them.

import { Suspense } from 'react';
import PlayContent from './PlayContent';
import { themes } from '@/lib/themes';

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{ minHeight: '100vh', backgroundColor: themes[0].backgroundColor }}
        />
      }
    >
      <PlayContent />
    </Suspense>
  );
}
