export type AiCoachSection =
  | 'summary'
  | 'experience'
  | 'projects'
  | 'skills'
  | 'education';

export interface AnalyzeRoleRequest {
  jobId?: string;
  targetRole?: string;
  resumeProfileId?: string;
}

export interface SectionCoachingRequest extends AnalyzeRoleRequest {
  section: AiCoachSection;
}

export interface ApplySectionRecommendationRequest {
  resumeProfileId: string;
  section: AiCoachSection;
  content?: string;
  selectedRecordIds?: string[];
}

export interface SectionRecommendation {
  section: AiCoachSection;
  currentContent?: string;
  recommendedContent: string;
  explanation: string;
  suggestedRecordIds?: string[];
  keywordsAdded?: string[];
}

export interface AiCoachAnalysisResponse {
  available: boolean;
  message?: string;
  targetRole?: string;
  company?: string;
  matchingOverview?: {
    strengths: string[];
    gaps: string[];
    overallAdvice: string;
  };
  sectionRecommendations?: Partial<
    Record<AiCoachSection, SectionRecommendation>
  >;
}
