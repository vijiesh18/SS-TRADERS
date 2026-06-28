"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useAuthHydrated } from "@/hooks/use-hydrated";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrated = useAuthHydrated();

  useEffect(() => {
    // Only decide once the persisted session has been restored, otherwise we'd
    // redirect to /login on every refresh before the token loads back in.
    if (hydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated) return null;        // still restoring the saved session
  if (!isAuthenticated) return null; // confirmed logged out — redirecting

  return <>{children}</>;
}
