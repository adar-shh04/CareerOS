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
