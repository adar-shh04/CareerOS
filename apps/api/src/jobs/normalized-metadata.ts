import type { ExperienceRequirements } from '@repo/types';

import { isSeniorityLabel, type SeniorityLabel } from './seniority';

/**
 * Durable normalization output stored in `jobs.normalized_metadata`.
 *
 * - column NULL                → legacy job, never normalized.
 * - object with a field absent → normalized; the posting did not state it.
 */
export interface NormalizedJobMetadata {
  schemaVersion: 1;
  seniority: SeniorityLabel | null;
  experienceRequirements: ExperienceRequirements | null;
}

export function buildNormalizedMetadata(input: {
  seniority?: string;
  experienceRequirements?: ExperienceRequirements;
}): NormalizedJobMetadata {
  return {
    schemaVersion: 1,
    seniority: isSeniorityLabel(input.seniority) ? input.seniority : null,
    experienceRequirements: sanitizeExperience(input.experienceRequirements),
  };
}

/** Parse the stored column; null for legacy/unrecognized values. */
export function parseNormalizedMetadata(
  value: unknown,
): NormalizedJobMetadata | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (raw.schemaVersion !== 1) return null;
  return {
    schemaVersion: 1,
    seniority: isSeniorityLabel(raw.seniority) ? raw.seniority : null,
    experienceRequirements: sanitizeExperience(raw.experienceRequirements),
  };
}

function sanitizeExperience(value: unknown): ExperienceRequirements | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  const years = (n: unknown) =>
    typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 60
      ? n
      : undefined;
  const minYears = years(raw.minYears);
  const maxYears = years(raw.maxYears);
  if (minYears === undefined && maxYears === undefined) return null;
  return {
    ...(minYears !== undefined ? { minYears } : {}),
    ...(maxYears !== undefined ? { maxYears } : {}),
    ...(typeof raw.text === 'string' && raw.text ? { text: raw.text } : {}),
  };
}
