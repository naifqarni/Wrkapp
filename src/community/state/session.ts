/**
 * Who is signed in to the community. One source: the API's own auth state.
 * `ready` turns true after the first answer, so screens can tell "signed out" from "not known yet".
 */
import { useEffect } from 'react';
import { create } from 'zustand';

import { getCommunityApi } from '../api';
import type { Me } from '../api/types';

interface SessionState {
  me: Me | null;
  ready: boolean;
  set: (me: Me | null) => void;
}

export const useSession = create<SessionState>((set) => ({
  me: null,
  ready: false,
  set: (me) => set({ me, ready: true }),
}));

let started = false;
let onChange: ((me: Me | null) => void) | null = null;

/** Starts listening once per app run. Safe to call from every screen. */
export function startSession(invalidate: () => void) {
  onChange = invalidate;
  if (started) return;
  started = true;
  const api = getCommunityApi();
  api.onAuthChange((me) => {
    const prev = useSession.getState().me;
    useSession.getState().set(me);
    // likedByMe / mine / the company channel all depend on who is asking.
    if ((prev?.id ?? null) !== (me?.id ?? null)) onChange?.(me);
  });
  api
    .getMe()
    .then((me) => useSession.getState().set(me))
    .catch(() => useSession.getState().set(null));
}

export function useMe() {
  return useSession((s) => s.me);
}

/** For tests and previews. */
export function resetSessionForTests() {
  started = false;
  useSession.setState({ me: null, ready: false });
}

export function useSessionBoot(invalidate: () => void) {
  useEffect(() => {
    startSession(invalidate);
  }, [invalidate]);
}
