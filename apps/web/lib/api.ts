import type {
  AuthSession,
  ByokCredentialSummary,
  CanonicalJob,
  CreateResumeVersionInput,
  JobAnalysisResult,
  JobMatchingWeights,
  JobOpportunity,
  MasterCareerProfile,
  MasterCareerProfileInput,
  ResumeProfile,
  ResumeProfileInput,
  ResumeVersion,
  WorkspaceJobStatus,
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

function getWorkspacePath(workspaceId: string): string {
  const wsId = workspaceId && workspaceId.trim() !== "" ? workspaceId.trim() : "current";
  return `${getApiBaseUrl()}/workspaces/${wsId}`;
}

export async function fetchByokStatus(
  sessionCookie: string,
  workspaceId: string,
): Promise<ByokCredentialSummary[]> {
  const response = await fetch(
    `${getWorkspacePath(workspaceId)}/byok`,
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
    `${getWorkspacePath(workspaceId)}/byok`,
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
    `${getWorkspacePath(workspaceId)}/career-profile`,
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
    `${getWorkspacePath(workspaceId)}/career-profile`,
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
    `${getWorkspacePath(workspaceId)}/resume-profiles`,
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
    `${getWorkspacePath(workspaceId)}/resume-profiles`,
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

export async function fetchResumeProfile(
  sessionCookie: string,
  workspaceId: string,
  profileId: string,
): Promise<ResumeProfile> {
  const response = await fetch(
    `${getWorkspacePath(workspaceId)}/resume-profiles/${profileId}`,
    {
      headers: {
        Cookie: sessionCookie,
      },
      cache: "no-store",
    },
  );

  return parseResponse<ResumeProfile>(response);
}

export async function updateResumeProfile(
  sessionCookie: string,
  workspaceId: string,
  profileId: string,
  input: ResumeProfileInput,
): Promise<ResumeProfile> {
  const response = await fetch(
    `${getWorkspacePath(workspaceId)}/resume-profiles/${profileId}`,
    {
      method: "PUT",
      headers: {
        Cookie: sessionCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return parseResponse<ResumeProfile>(response);
}

export async function deleteResumeProfile(
  sessionCookie: string,
  workspaceId: string,
  profileId: string,
): Promise<{ deleted: boolean }> {
  const response = await fetch(
    `${getWorkspacePath(workspaceId)}/resume-profiles/${profileId}`,
    {
      method: "DELETE",
      headers: {
        Cookie: sessionCookie,
      },
    },
  );

  return parseResponse<{ deleted: boolean }>(response);
}

export async function listResumeVersions(
  sessionCookie: string,
  workspaceId: string,
  profileId: string,
): Promise<ResumeVersion[]> {
  const response = await fetch(
    `${getWorkspacePath(workspaceId)}/resume-profiles/${profileId}/versions`,
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
    `${getWorkspacePath(workspaceId)}/resume-profiles/${profileId}/versions`,
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
    `${getWorkspacePath(workspaceId)}/jobs${search}`,
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
    `${getWorkspacePath(workspaceId)}/jobs/${jobId}`,
    {
      headers: { Cookie: sessionCookie },
      cache: "no-store",
    },
  );

  return parseResponse<CanonicalJob>(response);
}

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
    `${getWorkspacePath(workspaceId)}/jobs/ingest`,
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
    `${getWorkspacePath(workspaceId)}/jobs/${jobId}/match`,
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
  analysis: JobAnalysisResult;
  profile: ResumeProfile;
 }> {
  const response = await fetch(
    `${getWorkspacePath(workspaceId)}/jobs/${jobId}/targeted-resume`,
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
    analysis: JobAnalysisResult;
    profile: ResumeProfile;
  }>(response);
}

export async function fetchJobAnalysis(
  sessionCookie: string,
  workspaceId: string,
  jobId: string,
): Promise<JobAnalysisResult> {
  const response = await fetch(
    `${getWorkspacePath(workspaceId)}/jobs/${jobId}/analysis`,
    {
      headers: {
        Cookie: sessionCookie,
      },
      cache: "no-store",
    },
  );

  return parseResponse<JobAnalysisResult>(response);
}

export async function saveJob(
  sessionCookie: string,
  workspaceId: string,
  jobId: string,
): Promise<JobOpportunity> {
  const response = await fetch(
    `${getWorkspacePath(workspaceId)}/jobs/${jobId}/save`,
    {
      method: "POST",
      headers: {
        Cookie: sessionCookie,
        "Content-Type": "application/json",
      },
    },
  );

  return parseResponse<JobOpportunity>(response);
}

export async function dismissJob(
  sessionCookie: string,
  workspaceId: string,
  jobId: string,
): Promise<JobOpportunity> {
  const response = await fetch(
    `${getWorkspacePath(workspaceId)}/jobs/${jobId}/dismiss`,
    {
      method: "POST",
      headers: {
        Cookie: sessionCookie,
        "Content-Type": "application/json",
      },
    },
  );

  return parseResponse<JobOpportunity>(response);
}

export async function restoreJob(
  sessionCookie: string,
  workspaceId: string,
  jobId: string,
): Promise<JobOpportunity> {
  const response = await fetch(
    `${getWorkspacePath(workspaceId)}/jobs/${jobId}/restore`,
    {
      method: "POST",
      headers: {
        Cookie: sessionCookie,
        "Content-Type": "application/json",
      },
    },
  );

  return parseResponse<JobOpportunity>(response);
}

export async function updateJobState(
  sessionCookie: string,
  workspaceId: string,
  jobId: string,
  input: {
    status?: WorkspaceJobStatus;
    notes?: string;
    appliedAt?: string;
  },
): Promise<JobOpportunity> {
  const response = await fetch(
    `${getWorkspacePath(workspaceId)}/jobs/${jobId}/state`,
    {
      method: "PATCH",
      headers: {
        Cookie: sessionCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return parseResponse<JobOpportunity>(response);
}

/* ── Resume Parsing & Import API ───────────────────────────────────────── */

export async function parseResume(
  sessionCookie: string,
  workspaceId: string,
  input: { resumeText: string },
): Promise<MasterCareerProfileInput> {
  const response = await fetch(
    `${getWorkspacePath(workspaceId)}/resume-profiles/parse`,
    {
      method: "POST",
      headers: {
        Cookie: sessionCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return parseResponse<MasterCareerProfileInput>(response);
}

/* ── Application Tracking API ──────────────────────────────────────────── */

export interface TrackedApplication {
  id: string;
  organizationId: string;
  jobId: string;
  status: string;
  notes: string | null;
  appliedAt: string | null;
  resumeProfileId: string | null;
  resumeVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationStatusHistory {
  id: string;
  applicationId: string;
  status: string;
  notes: string | null;
  createdAt: string;
}

export interface ApplicationStats {
  total: number;
  saved: number;
  applied: number;
  interviewing: number;
  offers: number;
}

export async function fetchApplications(
  sessionCookie: string,
  workspaceId: string,
): Promise<TrackedApplication[]> {
  const response = await fetch(
    `${getWorkspacePath(workspaceId)}/applications`,
    {
      headers: { Cookie: sessionCookie },
      cache: "no-store",
    },
  );

  return parseResponse<TrackedApplication[]>(response);
}

export async function fetchApplicationsStats(
  sessionCookie: string,
  workspaceId: string,
): Promise<ApplicationStats> {
  // Derive stats client-side from applications list to avoid a separate endpoint
  const apps = await fetchApplications(sessionCookie, workspaceId);
  return {
    total: apps.length,
    saved: apps.filter((a) => a.status === "saved").length,
    applied: apps.filter((a) => a.status === "applied").length,
    interviewing: apps.filter(
      (a) => a.status === "screening" || a.status === "interview",
    ).length,
    offers: apps.filter((a) => a.status === "offer").length,
  };
}

export async function trackApplication(
  sessionCookie: string,
  workspaceId: string,
  jobId: string,
  status: string,
): Promise<TrackedApplication> {
  const response = await fetch(
    `${getWorkspacePath(workspaceId)}/applications`,
    {
      method: "POST",
      headers: {
        Cookie: sessionCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jobId, status }),
    },
  );

  return parseResponse<TrackedApplication>(response);
}

export async function updateApplicationState(
  sessionCookie: string,
  workspaceId: string,
  applicationId: string,
  input: {
    status?: string;
    notes?: string;
    appliedAt?: string;
  },
): Promise<TrackedApplication> {
  const response = await fetch(
    `${getWorkspacePath(workspaceId)}/applications/${applicationId}`,
    {
      method: "PATCH",
      headers: {
        Cookie: sessionCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return parseResponse<TrackedApplication>(response);
}

export async function deleteApplication(
  sessionCookie: string,
  workspaceId: string,
  applicationId: string,
): Promise<void> {
  const response = await fetch(
    `${getWorkspacePath(workspaceId)}/applications/${applicationId}`,
    {
      method: "DELETE",
      headers: { Cookie: sessionCookie },
    },
  );

  if (!response.ok && response.status !== 204) {
    await parseResponse<unknown>(response);
  }
}

export async function fetchApplicationHistory(
  sessionCookie: string,
  workspaceId: string,
  applicationId: string,
): Promise<ApplicationStatusHistory[]> {
  const response = await fetch(
    `${getWorkspacePath(workspaceId)}/applications/${applicationId}/history`,
    {
      headers: { Cookie: sessionCookie },
      cache: "no-store",
    },
  );

  return parseResponse<ApplicationStatusHistory[]>(response);
}