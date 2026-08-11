import type {
  AuthSession,
  ByokCredentialSummary,
  CanonicalJob,
  CreateResumeVersionInput,
  JobMatchingWeights,
  JobOpportunity,
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
  sessionCookie: string,
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
        Cookie: sessionCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return parseResponse<AuthSession>(response);
}

export async function fetchByokStatus(
  sessionCookie: string,
  workspaceId: string,
): Promise<ByokCredentialSummary[]> {
  const response = await fetch(
    `${getApiBaseUrl()}/workspaces/${workspaceId}/byok`,
    {
      headers: {
        Cookie: sessionCookie,
      },
      cache: "no-store",
    },
  );

  return parseResponse<ByokCredentialSummary[]>(response);
}

export async function storeByokCredential(
  sessionCookie: string,
  workspaceId: string,
  input: { provider: string; apiKey: string },
): Promise<unknown> {
  const response = await fetch(
    `${getApiBaseUrl()}/workspaces/${workspaceId}/byok`,
    {
      method: "POST",
      headers: {
        Cookie: sessionCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return parseResponse(response);
}

/* ── Master Career Profile API ────────────────────────────────────────── */

export async function fetchCareerProfile(
  sessionCookie: string,
  workspaceId: string,
): Promise<MasterCareerProfile> {
  const response = await fetch(
    `${getApiBaseUrl()}/workspaces/${workspaceId}/career-profile`,
    {
      headers: {
        Cookie: sessionCookie,
      },
      cache: "no-store",
    },
  );

  return parseResponse<MasterCareerProfile>(response);
}

export async function saveCareerProfile(
  sessionCookie: string,
  workspaceId: string,
  input: MasterCareerProfileInput,
): Promise<MasterCareerProfile> {
  const response = await fetch(
    `${getApiBaseUrl()}/workspaces/${workspaceId}/career-profile`,
    {
      method: "PUT",
      headers: {
        Cookie: sessionCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return parseResponse<MasterCareerProfile>(response);
}

/* ── Resume Profiles & Versions API ───────────────────────────────────── */

export async function listResumeProfiles(
  sessionCookie: string,
  workspaceId: string,
): Promise<ResumeProfile[]> {
  const response = await fetch(
    `${getApiBaseUrl()}/workspaces/${workspaceId}/resume-profiles`,
    {
      headers: {
        Cookie: sessionCookie,
      },
      cache: "no-store",
    },
  );

  return parseResponse<ResumeProfile[]>(response);
}

export async function createResumeProfile(
  sessionCookie: string,
  workspaceId: string,
  input: ResumeProfileInput,
): Promise<ResumeProfile> {
  const response = await fetch(
    `${getApiBaseUrl()}/workspaces/${workspaceId}/resume-profiles`,
    {
      method: "POST",
      headers: {
        Cookie: sessionCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return parseResponse<ResumeProfile>(response);
}

export async function listResumeVersions(
  sessionCookie: string,
  workspaceId: string,
  profileId: string,
): Promise<ResumeVersion[]> {
  const response = await fetch(
    `${getApiBaseUrl()}/workspaces/${workspaceId}/resume-profiles/${profileId}/versions`,
    {
      headers: {
        Cookie: sessionCookie,
      },
      cache: "no-store",
    },
  );

  return parseResponse<ResumeVersion[]>(response);
}

export async function createResumeVersion(
  sessionCookie: string,
  workspaceId: string,
  profileId: string,
  input: CreateResumeVersionInput,
): Promise<ResumeVersion> {
  const response = await fetch(
    `${getApiBaseUrl()}/workspaces/${workspaceId}/resume-profiles/${profileId}/versions`,
    {
      method: "POST",
      headers: {
        Cookie: sessionCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return parseResponse<ResumeVersion>(response);
}

/* ── Job Board API ─────────────────────────────────────────────────────── */

export interface ListJobsParams {
  query?: string;
  remoteOnly?: boolean;
  skill?: string;
  limit?: number;
  offset?: number;
}

export async function listJobs(
  sessionCookie: string,
  workspaceId: string,
  params: ListJobsParams = {},
): Promise<JobOpportunity[]> {
  const qs = new URLSearchParams();
  if (params.query) qs.set("query", params.query);
  if (params.remoteOnly) qs.set("remoteOnly", "true");
  if (params.skill) qs.set("skill", params.skill);
  if (params.limit != null) qs.set("limit", String(params.limit));
  if (params.offset != null) qs.set("offset", String(params.offset));
  const search = qs.toString() ? `?${qs.toString()}` : "";

  const response = await fetch(
    `${getApiBaseUrl()}/workspaces/${workspaceId}/jobs${search}`,
    {
      headers: { Cookie: sessionCookie },
      cache: "no-store",
    },
  );

  return parseResponse<JobOpportunity[]>(response);
}

export async function getJob(
  sessionCookie: string,
  workspaceId: string,
  jobId: string,
): Promise<CanonicalJob> {
  const response = await fetch(
    `${getApiBaseUrl()}/workspaces/${workspaceId}/jobs/${jobId}`,
    {
      headers: { Cookie: sessionCookie },
      cache: "no-store",
    },
  );

  return parseResponse<CanonicalJob>(response);
}

/**
 * Trigger real job ingestion via external source adapter (e.g. Apify/LinkedIn).
 */
export async function ingestJobs(
  sessionCookie: string,
  workspaceId: string,
  params?: { query?: string; location?: string; limit?: number; source?: string },
): Promise<{
  source: string;
  fetchedCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  jobs: JobOpportunity[];
}> {
  const response = await fetch(
    `${getApiBaseUrl()}/workspaces/${workspaceId}/jobs/ingest`,
    {
      method: "POST",
      headers: {
        Cookie: sessionCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params ?? {}),
    },
  );

  return parseResponse<{
    source: string;
    fetchedCount: number;
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    jobs: JobOpportunity[];
  }>(response);
}

export async function triggerJobMatch(
  sessionCookie: string,
  workspaceId: string,
  jobId: string,
  options?: { resumeProfileId?: string; weights?: Partial<JobMatchingWeights> },
): Promise<JobOpportunity> {
  const response = await fetch(
    `${getApiBaseUrl()}/workspaces/${workspaceId}/jobs/${jobId}/match`,
    {
      method: "POST",
      headers: {
        Cookie: sessionCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(options ?? {}),
    },
  );

  return parseResponse<JobOpportunity>(response);
}

export async function createTargetedResumeForJob(
  sessionCookie: string,
  workspaceId: string,
  jobId: string,
  options?: { resumeProfileId?: string },
): Promise<{
  version: ResumeVersion;
  analysis: import("@repo/types").JobAnalysisResult;
  profile: ResumeProfile;
}> {
  const response = await fetch(
    `${getApiBaseUrl()}/workspaces/${workspaceId}/jobs/${jobId}/targeted-resume`,
    {
      method: "POST",
      headers: {
        Cookie: sessionCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(options ?? {}),
    },
  );

  return parseResponse<{
    version: ResumeVersion;
    analysis: import("@repo/types").JobAnalysisResult;
    profile: ResumeProfile;
  }>(response);
}

export async function fetchJobAnalysis(
  sessionCookie: string,
  workspaceId: string,
  jobId: string,
): Promise<import("@repo/types").JobAnalysisResult> {
  const response = await fetch(
    `${getApiBaseUrl()}/workspaces/${workspaceId}/jobs/${jobId}/analysis`,
    {
      headers: {
        Cookie: sessionCookie,
      },
      cache: "no-store",
    },
  );

  return parseResponse<import("@repo/types").JobAnalysisResult>(response);

}