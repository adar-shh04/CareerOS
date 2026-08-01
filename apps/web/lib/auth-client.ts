import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

import { getApiBaseUrl } from "./config";

/**
 * Talks directly to the NestJS API's /api/auth/* endpoints (mounted via
 * toNodeHandler in apps/api/src/main.ts). Used from client components —
 * this is what replaces the old fetch("/api/auth/login") calls into the
 * Next.js proxy routes.
 */
export const authClient = createAuthClient({
  baseURL: `${getApiBaseUrl()}/auth`,
  plugins: [organizationClient()],
});

export const { useSession, signIn, signUp, signOut, organization } =
  authClient;
