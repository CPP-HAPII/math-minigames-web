'use client';

// Stage 4 placeholder — full home page comes in Stage 5.

import { useState, useEffect } from 'react';
import { useUserStore } from '@/lib/stores/userStore';
import { greenTheme } from '@/lib/themes';

export default function HomePage() {
  const userId = useUserStore((s) => s.userId);
  // Guard against SSR/client mismatch: localStorage isn't available during
  // pre-render, so the store starts empty. Show real value only after hydration.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center gap-2"
      style={{ backgroundColor: greenTheme.backgroundColor }}
    >
      <h1
        className="text-2xl font-bold"
        style={{ color: greenTheme.textColor }}
      >
        Home &mdash; userId: {hydrated ? userId || '(not set)' : '…'}
      </h1>
    </main>
  );
}
