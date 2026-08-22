import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * True once the client has hydrated, false during SSR and the first client
 * render — the guard every page reading a Zustand `persist` store (theme,
 * assist level, etc.) needs to avoid an SSR/localStorage mismatch. Implemented
 * with useSyncExternalStore (client/server snapshots differ) rather than
 * useState+useEffect, since setting state synchronously inside an effect body
 * trips the react-hooks/set-state-in-effect lint rule.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
