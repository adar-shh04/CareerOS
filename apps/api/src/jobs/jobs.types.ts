import type {
  CanonicalJob,
  ExperienceRequirements,
  JobMatchDimensionScores,
  JobMatchEvidence,
  JobMatchingWeights,
  WorkspaceJobState,
} from '@repo/types';

import type { MasterCareerProfile } from '../career-profile/career-profile.types';
import type { ResumeProfile } from '../resume-profile/resume-profile.types';

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
  masterProfile: MasterCareerProfile;
  /** Optional — when provided the engine also weighs priority skill/experience/project IDs. */
  resumeProfile?: ResumeProfile;
  weights?: JobMatchingWeights;
}

/** Raw output from the matching engine before persistence. */
export interface MatchOutput {
  overallScore: number;
  dimensionScores: JobMatchDimensionScores;
  matchedSkills: string[];
  missingSkills: string[];
  matchedPreferredSkills: string[];
  missingPreferredSkills: string[];
  confidence: number;
  explanation: string;
  evidence: JobMatchEvidence;
}

/** Shape for creating or upserting a canonical job record. */
export interface CreateJobInput {
  externalId?: string;
  fingerprint?: string;
  source?: string;
  sourceUrl?: string;
  company: string;
  title: string;
  location: string;
  isRemote?: boolean;
  remotePolicy?: string;
  seniority?: string;
  experienceRequirements?: ExperienceRequirements;
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
  /**
   * True when the input came from the normalization pipeline. Its seniority and
   * experienceRequirements (possibly undefined = "not stated") are then persisted
   * as authoritative normalized data.
   */
  normalized?: boolean;
}

/** Query filters for listing canonical jobs. */
export interface ListJobsQuery {
  query?: string;
  remoteOnly?: boolean;
  skill?: string;
  /** Only jobs this workspace saved. */
  savedOnly?: boolean;
  /** Exclude jobs this workspace dismissed. */
  hideDismissed?: boolean;
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
  profileVersion?: number | null;
  /** Source inputs (see match-freshness.ts); null on legacy rows. */
  matcherVersion?: number | null;
  jobUpdatedAt?: Date | null;
  resumeProfileUpdatedAt?: Date | null;
  weightsKey?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Minimal job fields needed to rank a job. */
export interface JobRankingKey {
  id: string;
  postedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Generic match score plus the inputs it was computed from. */
export interface GenericMatchSourceRow {
  jobId: string;
  overallScore: number;
  matcherVersion: number | null;
  profileVersion: number | null;
  jobUpdatedAt: Date | null;
  resumeProfileUpdatedAt: Date | null;
  weightsKey: string | null;
}
