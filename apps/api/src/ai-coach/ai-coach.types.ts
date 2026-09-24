// AI Coach contract types are shared with the web client so that failure
// states (available/failureReason) cannot drift between API and UI.
export type {
  AiCoachAnalysisResponse,
  AiCoachSection,
  AiFailureReason,
  AnalyzeRoleRequest,
  ApplySectionRecommendationRequest,
  SectionCoachingRequest,
  SectionCoachingResponse,
  SectionRecommendation,
} from '@repo/types';
