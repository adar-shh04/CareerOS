import type { JobMatchingWeights } from '@repo/types';
import { DEFAULT_MATCHING_WEIGHTS } from '@repo/types';

/**
 * Version of the deterministic matching algorithm. Bump whenever scoring or
 * evidence semantics change so every stored match is recomputed.
 *   2 — canonical skill identity, preferred-skill evidence, normalized
 *       seniority/experience (stabilization passes 1–2).
 */
export const MATCHER_VERSION = 2;

export const DEFAULT_WEIGHTS_KEY = 'default';

/**
 * The inputs a stored match was computed from. They are persisted with the
 * match (traceability) and a match is current only if they all equal the
 * current inputs (freshness).
 */
export interface MatchSource {
  matcherVersion: number;
  /** MasterCareerProfile.version */
  profileVersion: number;
  /** Job.updatedAt — re-ingestion can change skills/requirements. */
  jobUpdatedAt: Date;
  /** ResumeProfile.updatedAt for profile-specific matches, else null. */
  resumeProfileUpdatedAt: Date | null;
  /** "default" or the exact custom weights used. */
  weightsKey: string;
}

export function weightsKey(weights?: Partial<JobMatchingWeights>): string {
  const effective = { ...DEFAULT_MATCHING_WEIGHTS, ...weights };
  const keys = Object.keys(
    DEFAULT_MATCHING_WEIGHTS,
  ) as (keyof JobMatchingWeights)[];
  const isDefault = keys.every(
    (k) => effective[k] === DEFAULT_MATCHING_WEIGHTS[k],
  );
  return isDefault
    ? DEFAULT_WEIGHTS_KEY
    : JSON.stringify(keys.map((k) => [k, effective[k]]));
}

export function currentMatchSource(input: {
  jobUpdatedAt: string | Date;
  profileVersion: number;
  resumeProfileUpdatedAt?: string | Date | null;
  weights?: Partial<JobMatchingWeights>;
}): MatchSource {
  return {
    matcherVersion: MATCHER_VERSION,
    profileVersion: input.profileVersion,
    jobUpdatedAt: new Date(input.jobUpdatedAt),
    resumeProfileUpdatedAt: input.resumeProfileUpdatedAt
      ? new Date(input.resumeProfileUpdatedAt)
      : null,
    weightsKey: weightsKey(input.weights),
  };
}

interface StoredSource {
  matcherVersion?: number | null;
  profileVersion?: number | null;
  jobUpdatedAt?: Date | null;
  resumeProfileUpdatedAt?: Date | null;
  weightsKey?: string | null;
}

const sameTime = (a: Date | null | undefined, b: Date | null) =>
  a == null || b === null ? (a ?? null) === b : a.getTime() === b.getTime();

/** True only when every recorded input equals the current input. Legacy rows (NULLs) are stale. */
export function isMatchFresh(
  stored: StoredSource,
  current: MatchSource,
): boolean {
  return (
    stored.matcherVersion === current.matcherVersion &&
    stored.profileVersion === current.profileVersion &&
    stored.weightsKey === current.weightsKey &&
    stored.jobUpdatedAt != null &&
    sameTime(stored.jobUpdatedAt, current.jobUpdatedAt) &&
    sameTime(stored.resumeProfileUpdatedAt, current.resumeProfileUpdatedAt)
  );
}
