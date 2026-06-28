"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";

/**
 * Returns true once the persisted auth store has rehydrated from localStorage.
 *
 * Without this, the first render after a page refresh sees the store's default
 * (logged-out) state before the saved token is restored — which makes auth
 * guards redirect to /login on every refresh even though a valid session exists.
 */
export function useAuthHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  return hydrated;
}
