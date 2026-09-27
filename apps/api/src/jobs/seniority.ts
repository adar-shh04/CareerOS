/**
 * Job seniority vocabulary shared by ingestion (normalization) and matching.
 *
 * Seniority is classified from the job TITLE only, using whole-word matches.
 * Descriptions routinely mention other levels ("work with senior engineers"),
 * so they are not used. When the title carries no signal the seniority is
 * unknown — it is never defaulted to "Mid".
 */
export const SENIORITY_LEVELS = {
  'Junior / Entry': 0,
  Mid: 1,
  Senior: 2,
  'Staff / Lead': 3,
  Management: 3,
  Principal: 4,
} as const;

export type SeniorityLabel = keyof typeof SENIORITY_LEVELS;

const RULES: [RegExp, SeniorityLabel][] = [
  [/\b(principal|distinguished|fellow)\b/, 'Principal'],
  [/\b(staff|lead|architect)\b/, 'Staff / Lead'],
  [/\b(senior|sr)\b/, 'Senior'],
  [/\b(junior|jr|entry|associate|intern|graduate)\b/, 'Junior / Entry'],
  [/\b(manager|head of|director|vp|vice president)\b/, 'Management'],
  [
    /\b(mid|mid-level|intermediate)\b|\b(engineer|developer|analyst)\s+ii\b/,
    'Mid',
  ],
];

export function classifySeniorityFromTitle(
  title: string,
): SeniorityLabel | undefined {
  const text = title.toLowerCase();
  return RULES.find(([pattern]) => pattern.test(text))?.[1];
}

export function isSeniorityLabel(value: unknown): value is SeniorityLabel {
  return typeof value === 'string' && value in SENIORITY_LEVELS;
}

/** Where a job's seniority / experience requirement came from. */
export type JobRequirementSource =
  | 'normalized'
  | 'inferred_from_title'
  | 'unknown';

export interface ResolvedJobRequirements {
  seniority?: SeniorityLabel;
  senioritySource: JobRequirementSource;
  requiredYears?: number;
  requiredYearsSource: Exclude<JobRequirementSource, 'inferred_from_title'>;
}

/**
 * Resolve a job's seniority and years-of-experience requirement.
 * - Normalized (persisted) values are authoritative.
 * - Only legacy jobs that were never normalized fall back to title inference,
 *   and that fallback is labelled as such.
 * - Anything else is unknown; nothing is assumed (no default "Mid" or years).
 */
export function resolveJobRequirements(job: {
  title: string;
  seniority?: string;
  experienceRequirements?: { minYears?: number };
  isNormalized?: boolean;
}): ResolvedJobRequirements {
  let seniority: SeniorityLabel | undefined;
  let senioritySource: JobRequirementSource = 'unknown';
  if (isSeniorityLabel(job.seniority)) {
    seniority = job.seniority;
    senioritySource = 'normalized';
  } else if (!job.isNormalized) {
    seniority = classifySeniorityFromTitle(job.title);
    if (seniority) senioritySource = 'inferred_from_title';
  }

  const minYears = job.experienceRequirements?.minYears;
  return {
    seniority,
    senioritySource,
    ...(minYears !== undefined ? { requiredYears: minYears } : {}),
    requiredYearsSource: minYears !== undefined ? 'normalized' : 'unknown',
  };
}
