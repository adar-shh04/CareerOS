"use client";

import type { AuthSession } from "@repo/types";
import { createContext, useContext, useMemo } from "react";

import { authClient, signOut, useSession } from "../lib/auth-client";

interface AuthContextValue {
  session: AuthSession | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data, isPending, refetch } = useSession();
  const { data: activeOrg } = authClient.useActiveOrganization();

  const session: AuthSession | null = useMemo(() => {
    if (!data?.user) {
      return null;
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        avatar: data.user.image ?? null,
      },
      workspace: {
        id: activeOrg?.id ?? "",
        name: activeOrg?.name ?? "",
        slug: activeOrg?.slug ?? "",
      },
      needsOnboarding: !data.user.name,
    };
  }, [data, activeOrg]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading: isPending,
      refreshSession: async () => {
        await refetch();
      },
      logout: async () => {
        await signOut();
        window.location.href = "/login";
      },
    }),
    [session, isPending, refetch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
