import { headers } from "next/headers";

import { getApiBaseUrl } from "./config";

export interface ServerSession {
  /**
   * The browser's original Better Auth `Cookie` header, verbatim.
   * Forward this as `Cookie: ${token}` on every call from a Next.js
   * route handler to the NestJS API.
   *
   * The field remains named `token` so existing route handlers and
   * `lib/api.ts` do not need to change.
   */
  token: string;

  user: {
    id: string;
    email: string;
    name: string | null;
    avatar: string | null;
  };

  workspace: {
    id: string;
    name: string;
    slug: string;
  };

  needsOnboarding: boolean;
}

/**
 * Reads the incoming Better Auth session cookie and asks the API
 * to resolve it.
 *
 * Workspace resolution intentionally mirrors BetterAuthGuard:
 * use the session's activeOrganizationId when available, otherwise
 * fall back to the user's first organization.
 */
export async function getServerSession(): Promise<ServerSession | null> {
  const incomingHeaders = await headers();
  const cookie = incomingHeaders.get("cookie");

  if (!cookie) {
    return null;
  }

  const apiBaseUrl = getApiBaseUrl();
  const sessionUrl = `${apiBaseUrl}/api/auth/get-session`;

  let response: Response;

  try {
    response = await fetch(sessionUrl, {
      headers: { cookie },
      cache: "no-store",
    });
  } catch (error) {
    console.error("[server-session] get-session fetch failed:", error);
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    session?: {
      activeOrganizationId?: string | null;
    };
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

  let workspaceId = payload.session.activeOrganizationId ?? null;

  if (!workspaceId) {
    const organizationsUrl =
      `${apiBaseUrl}/api/auth/organization/list`;

    const organizationsResponse = await fetch(organizationsUrl, {
      headers: { cookie },
      cache: "no-store",
    });

    if (!organizationsResponse.ok) {
      console.error(
        "[server-session] organization list failed:",
        organizationsResponse.status,
        organizationsResponse.statusText,
      );
      return null;
    }

    const organizations = (await organizationsResponse.json()) as {
      id: string;
      name: string;
      slug: string;
    }[];

    workspaceId = organizations[0]?.id ?? null;
  }

  if (!workspaceId) {
    return {
      token: cookie,
      user: payload.user,
      workspace: {
        id: "current",
        name: "Workspace",
        slug: "",
      },
      needsOnboarding: true,
    };
  }

  const orgUrl =
    `${apiBaseUrl}/api/auth/organization/get-full-organization` +
    `?organizationId=${workspaceId}`;

  const orgResponse = await fetch(orgUrl, {
    headers: { cookie },
    cache: "no-store",
  });

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
    workspace: org ?? {
      id: workspaceId,
      name: "Workspace",
      slug: "",
    },
    needsOnboarding: !payload.user.name,
  };
}