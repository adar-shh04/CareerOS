import { isOnboardingComplete } from "@repo/types";
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

export interface GetServerSessionOptions {
  /**
   * If false, skips fetching full organization metadata.
   * Useful for BFF route handlers which only require the workspace ID and token.
   * Defaults to true.
   */
  fetchMetadata?: boolean;
}

/**
 * Reads the incoming Better Auth session cookie and asks the API
 * to resolve it.
 *
 * Workspace resolution intentionally mirrors BetterAuthGuard:
 * use the session's activeOrganizationId when available, otherwise
 * fall back to the user's first organization.
 */
export async function getServerSession(
  options: GetServerSessionOptions = { fetchMetadata: true },
): Promise<ServerSession | null> {
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

  if (options.fetchMetadata === false) {
    return {
      token: cookie,
      user: payload.user,
      workspace: {
        id: workspaceId,
        name: "Workspace",
        slug: "",
      },
      needsOnboarding: false,
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
        metadata?: unknown;
      })
    : null;

  if (!orgResponse.ok) {
    console.error(
      "[server-session] get-full-organization failed:",
      orgResponse.status,
      orgResponse.statusText,
    );
  }

  return {
    token: cookie,
    user: payload.user,
    workspace: org
      ? { id: org.id, name: org.name, slug: org.slug }
      : { id: workspaceId, name: "Workspace", slug: "" },
    // Completion is the persisted workspace onboarding state, never a proxy
    // such as the user's name. If the organization could not be loaded, do not
    // force the user back through onboarding on a transient error.
    needsOnboarding: org ? !isOnboardingComplete(org.metadata) : false,
  };
}