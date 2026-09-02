export const APPLICATION_STATUSES = [
  'saved',
  'applied',
  'screening',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface ApplicationJobSummary {
  id: string;
  title: string;
  company: string;
  location: string;
  isRemote: boolean;
  salaryRange: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  source: string;
  sourceUrl: string | null;
  postedAt: Date | null;
  requiredSkills: string[];
}

export interface ApplicationRecord {
  id: string;
  organizationId: string;
  jobId: string;
  status: ApplicationStatus;
  notes: string | null;
  appliedAt: Date | null;
  resumeProfileId: string | null;
  resumeVersionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  job?: ApplicationJobSummary | null;
}

export interface ApplicationStatusHistoryRecord {
  id: string;
  applicationId: string;
  status: ApplicationStatus;
  notes: string | null;
  createdAt: Date;
}

export interface CreateApplicationInput {
  jobId: string;
  status?: ApplicationStatus;
  notes?: string;
  appliedAt?: Date;
  resumeProfileId?: string;
  resumeVersionId?: string;
}

export interface UpdateApplicationInput {
  status?: ApplicationStatus;
  notes?: string;
  appliedAt?: Date;
  resumeProfileId?: string;
  resumeVersionId?: string;
}
