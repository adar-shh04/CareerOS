/**
 * RawIngestedJob represents un-normalized job data produced by a JobSourceAdapter
 * before it is cleaned, skill-extracted, deduplicated, and stored in the database.
 */
export interface RawIngestedJob {
  externalId: string;
  source: string;
  sourceUrl?: string;
  company: string;
  title: string;
  location: string;
  description: string;
  salaryText?: string;
  postedAtText?: string;
  isRemote?: boolean;
  rawSkills?: string[];
  rawData?: Record<string, unknown>;
}

export interface FetchJobsParams {
  query: string;
  location?: string;
  limit?: number;
  apiKey?: string;
}

/**
 * JobSourceAdapter contract isolating external job search providers / scrapers
 * from core domain logic.
 */
export interface JobSourceAdapter {
  readonly sourceId: string;
  fetchJobs(params: FetchJobsParams): Promise<RawIngestedJob[]>;
}
