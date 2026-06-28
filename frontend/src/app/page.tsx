"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useAuthHydrated } from "@/hooks/use-hydrated";

export default function RootPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrated = useAuthHydrated();

  useEffect(() => {
    // Wait for the persisted session to load before routing, so a refresh on
    // "/" doesn't bounce a logged-in user to /login.
    if (hydrated) {
      router.replace(isAuthenticated ? "/dashboard" : "/login");
    }
  }, [hydrated, isAuthenticated, router]);

  return null;
}
