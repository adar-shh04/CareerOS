import { headers } from "next/headers";

import { getApiBaseUrl } from "./config";

export interface ServerSession {
  /**
   * Forward this as `Authorization: Bearer ${token}` on every call from a
   * Next.js route handler to the NestJS API — same pattern the old
   * accessToken had, just sourced from Better Auth's session cookie
   * instead of a hand-rolled JWT.
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

  const response = await fetch(`${getApiBaseUrl()}/auth/get-session`, {
    headers: { cookie },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    session?: { token?: string; activeOrganizationId?: string };
    user?: {
      id: string;
      email: string;
      name: string | null;
      avatar: string | null;
    };
  } | null;

  if (!payload?.session?.token || !payload.user) {
    return null;
  }

  const workspaceId = payload.session.activeOrganizationId;

  if (!workspaceId) {
    return null;
  }

  const orgResponse = await fetch(
    `${getApiBaseUrl()}/auth/organization/get-full-organization?organizationId=${workspaceId}`,
    {
      headers: { Authorization: `Bearer ${payload.session.token}` },
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
    token: payload.session.token,
    user: payload.user,
    workspace: org ?? { id: workspaceId, name: "Workspace", slug: "" },
    needsOnboarding: !payload.user.name,
  };
}
