import type {
  AuthSession,
  ByokCredentialSummary,
  CreateResumeVersionInput,
  MasterCareerProfile,
  MasterCareerProfileInput,
  ResumeProfile,
  ResumeProfileInput,
  ResumeVersion,
} from "@repo/types";

import { getApiBaseUrl } from "./config";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | T
    | { message?: string | string[] }
    | null;

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      payload.message
        ? Array.isArray(payload.message)
          ? payload.message.join(", ")
          : payload.message
        : "Request failed";
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export async function completeOnboarding(
  accessToken: string,
  input: {
    name: string;
    workspaceName: string;
    targetRole?: string;
  },
): Promise<AuthSession> {
  const response = await fetch(
    `${getApiBaseUrl()}/workspaces/onboarding/complete`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return parseResponse<AuthSession>(response);
}

export async function fetchByokStatus(
  accessToken: string,
  workspaceId: string,
): Promise<ByokCredentialSummary[]> {
  const response = await fetch(
    `${getApiBaseUrl()}/workspaces/${workspaceId}/byok`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  return parseResponse<ByokCredentialSummary[]>(response);
}

export async function storeByokCredential(
  accessToken: string,
  workspaceId: string,
  input: { provider: string; apiKey: string },
): Promise<unknown> {
  const response = await fetch(
    `${getApiBaseUrl()}/workspaces/${workspaceId}/byok`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return parseResponse(response);
}

/* ── Master Career Profile API ────────────────────────────────────────── */

export async function fetchCareerProfile(
  accessToken: string,
  workspaceId: string,
): Promise<MasterCareerProfile> {
  const response = await fetch(
    `${getApiBaseUrl()}/workspaces/${workspaceId}/career-profile`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  return parseResponse<MasterCareerProfile>(response);
}

export async function saveCareerProfile(
  accessToken: string,
  workspaceId: string,
  input: MasterCareerProfileInput,
): Promise<MasterCareerProfile> {
  const response = await fetch(
    `${getApiBaseUrl()}/workspaces/${workspaceId}/career-profile`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return parseResponse<MasterCareerProfile>(response);
}

/* ── Resume Profiles & Versions API ───────────────────────────────────── */

export async function listResumeProfiles(
  accessToken: string,
  workspaceId: string,
): Promise<ResumeProfile[]> {
  const response = await fetch(
    `${getApiBaseUrl()}/workspaces/${workspaceId}/resume-profiles`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  return parseResponse<ResumeProfile[]>(response);
}

export async function createResumeProfile(
  accessToken: string,
  workspaceId: string,
  input: ResumeProfileInput,
): Promise<ResumeProfile> {
  const response = await fetch(
    `${getApiBaseUrl()}/workspaces/${workspaceId}/resume-profiles`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return parseResponse<ResumeProfile>(response);
}

export async function listResumeVersions(
  accessToken: string,
  workspaceId: string,
  profileId: string,
): Promise<ResumeVersion[]> {
  const response = await fetch(
    `${getApiBaseUrl()}/workspaces/${workspaceId}/resume-profiles/${profileId}/versions`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  return parseResponse<ResumeVersion[]>(response);
}

export async function createResumeVersion(
  accessToken: string,
  workspaceId: string,
  profileId: string,
  input: CreateResumeVersionInput,
): Promise<ResumeVersion> {
  const response = await fetch(
    `${getApiBaseUrl()}/workspaces/${workspaceId}/resume-profiles/${profileId}/versions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return parseResponse<ResumeVersion>(response);
}
