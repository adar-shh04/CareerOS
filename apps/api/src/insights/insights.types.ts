// Shared with the web client so the AI failure contract cannot drift.
export type { MarketIntelligenceResponse, SkillDemand } from '@repo/types';

export interface HandbookCareerPath {
  fieldId: string;
  title: string;
  description: string;
  commonRoles: string[];
  coreSkills: string[];
  technologies: string[];
  keywords: string[];
  learningPath: string[];
  studyResources: {
    title: string;
    url: string;
    description: string;
  }[];
}

export interface CareerHandbookResponse {
  careerPaths: HandbookCareerPath[];
}
