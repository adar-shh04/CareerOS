import type {
  CanonicalJob,
  JobMatchDimensionScores,
  JobMatchEvidence,
  JobMatchingWeights,
  WorkspaceJobState,
} from '@repo/types';

export type { CanonicalJob, JobMatchingWeights, WorkspaceJobState };

export const DEFAULT_WEIGHTS: JobMatchingWeights = {
  skill: 0.4,
  role: 0.25,
  experience: 0.2,
  location: 0.1,
  seniority: 0.05,
};

/** Input to the matching engine. */
export interface MatchInput {
  job: CanonicalJob;
  /** Full MasterCareerProfile from the jobs.types module (imported from career-profile domain) */
  masterProfile: import('../career-profile/career-profile.types').MasterCareerProfile;
  /** Optional — when provided the engine also weighs priority skill/experience/project IDs. */
  resumeProfile?: import('../resume-profile/resume-profile.types').ResumeProfile;
  weights?: JobMatchingWeights;
}

/** Raw output from the matching engine before persistence. */
export interface MatchOutput {
  overallScore: number;
  dimensionScores: JobMatchDimensionScores;
  matchedSkills: string[];
  missingSkills: string[];
  matchedPreferredSkills: string[];
  confidence: number;
  explanation: string;
  evidence: JobMatchEvidence;
}

/** Shape for creating or upserting a canonical job record. */
export interface CreateJobInput {
  externalId?: string;
  source?: string;
  sourceUrl?: string;
  company: string;
  title: string;
  location: string;
  isRemote?: boolean;
  remotePolicy?: string;
  employmentType?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryRange?: string;
  description?: string;
  requiredSkills?: string[];
  preferredSkills?: string[];
  postedAt?: Date;
  expiresAt?: Date;
}

/** Query filters for listing canonical jobs. */
export interface ListJobsQuery {
  query?: string;
  remoteOnly?: boolean;
  skill?: string;
  limit?: number;
  offset?: number;
}

/** Persisted job match record from the DB. */
export interface StoredJobMatch {
  id: string;
  jobId: string;
  workspaceId: string;
  resumeProfileId?: string | null;
  overallScore: number;
  skillScore: number;
  roleScore: number;
  experienceScore: number;
  locationScore: number;
  seniorityScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  confidence: number;
  explanation: string;
  evidence: JobMatchEvidence | null;
  createdAt: Date;
  updatedAt: Date;
}
