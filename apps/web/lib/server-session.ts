import { headers } from "next/headers";

import { getApiBaseUrl } from "./config";

export interface ServerSession {
  /**
   * The browser's original Better Auth `Cookie` header, verbatim. Forward
   * this as `Cookie: ${token}` (NOT `Authorization: Bearer`) on every call
   * from a Next.js route handler to the NestJS API — Better Auth resolves
   * the session from the cookie itself, the same way it already does for
   * the `get-session` call below. The field is still named `token` to
   * keep `lib/api.ts` and every route handler that reads `session.token`
   * unchanged; only what it contains has changed.
   */
  token: string;
  user: { id: string; email: string; name: string | null; avatar: string | null };
  workspace: { id: string; name: string; slug: string };
  needsOnboarding: boolean;
}

/**
 * Reads the incoming request's Better Auth session cookie and asks the API
 * to resolve it. Returns null if there's no valid session — route handlers
 * should respond 401 in that case, same as the old getAccessToken() flow.
 */
export async function getServerSession(): Promise<ServerSession | null> {
  const incomingHeaders = await headers();
  const cookie = incomingHeaders.get("cookie");

  if (!cookie) {
    return null;
  }

  const response = await fetch(`${getApiBaseUrl()}/api/auth/get-session`, {
    headers: { cookie },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    session?: { activeOrganizationId?: string };
    user?: {
      id: string;
      email: string;
      name: string | null;
      avatar: string | null;
    };
  } | null;

  if (!payload?.session || !payload.user) {
    return null;
  }

  const workspaceId = payload.session.activeOrganizationId;

  if (!workspaceId) {
    return null;
  }

  // Forward the original browser cookie — not a derived bearer token — so
  // Better Auth resolves this the same way it resolved the get-session call
  // above.
  const orgResponse = await fetch(
    `${getApiBaseUrl()}/api/auth/organization/get-full-organization?organizationId=${workspaceId}`,
    {
      headers: { cookie },
      cache: "no-store",
    },
  );

  const org = orgResponse.ok
    ? ((await orgResponse.json()) as {
      id: string;
      name: string;
      slug: string;
    })
    : null;

  return {
    token: cookie,
    user: payload.user,
    workspace: org ?? { id: workspaceId, name: "Workspace", slug: "" },
    needsOnboarding: !payload.user.name,
  };
}