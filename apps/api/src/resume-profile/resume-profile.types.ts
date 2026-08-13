import type { MasterCareerProfile } from '../career-profile/career-profile.types';

export type ResumeSection =
  | 'identity'
  | 'summary'
  | 'experience'
  | 'projects'
  | 'education'
  | 'skills'
  | 'technologies'
  | 'achievements'
  | 'certifications'
  | 'publications'
  | 'hackathons'
  | 'links';

export type ResumeOutputFormat = 'html' | 'latex' | 'pdf';

export type HighlightEmphasis = 'primary' | 'secondary';

export interface HighlightRule {
  recordId: string;
  emphasis?: HighlightEmphasis;
  keywordHints?: string[];
}

export interface ResumeProfileInput {
  name: string;
  roleFocus?: string;
  visibleSections?: ResumeSection[];
  sectionOrder?: ResumeSection[];
  summaryGuidance?: string;
  highlightRules?: HighlightRule[];
  priorityProjectIds?: string[];
  prioritySkillIds?: string[];
  priorityExperienceIds?: string[];
  priorityAchievementIds?: string[];
  priorityCertificationIds?: string[];
  templateId?: string;
  styleSettings?: Record<string, unknown>;
}

export interface ResumeProfile extends ResumeProfileInput {
  id: string;
  workspaceId: string;
  visibleSections: ResumeSection[];
  sectionOrder: ResumeSection[];
  highlightRules: HighlightRule[];
  priorityProjectIds: string[];
  prioritySkillIds: string[];
  priorityExperienceIds: string[];
  priorityAchievementIds: string[];
  priorityCertificationIds: string[];
  styleSettings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SelectedRecordIds {
  projectIds: string[];
  skillIds: string[];
  experienceIds: string[];
  achievementIds: string[];
  certificationIds: string[];
}

export interface CreateResumeVersionInput {
  targetCompany?: string;
  targetRole?: string;
  outputFormat?: ResumeOutputFormat;
  templateVersion?: string;
  selectedRecordIds?: SelectedRecordIds;
  jobAnalysisEvidence?: Record<string, unknown>;
  matchResult?: Record<string, unknown>;
  confidence?: number;
  explanation?: string;
  artifactMetadata?: Record<string, unknown>;
}

export interface ResumeVersion {
  id: string;
  workspaceId: string;
  resumeProfileId: string;
  targetCompany?: string;
  targetRole?: string;
  masterProfileSnapshot: MasterCareerProfile;
  selectedRecordIds: SelectedRecordIds;
  templateVersion?: string;
  outputFormat: ResumeOutputFormat;
  jobAnalysisEvidence?: Record<string, unknown>;
  matchResult?: Record<string, unknown>;
  confidence?: number;
  explanation?: string;
  artifactMetadata?: Record<string, unknown>;
  createdAt: string;
}

export const RESUME_SECTIONS: readonly ResumeSection[] = [
  'identity',
  'summary',
  'experience',
  'projects',
  'education',
  'skills',
  'technologies',
  'achievements',
  'certifications',
  'publications',
  'hackathons',
  'links',
] as const;
