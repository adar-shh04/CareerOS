export interface MarketIntelligenceResponse {
  available: boolean;
  reason?: string;
  jobDataCount?: number;
  topRequiredSkills?: string[];
  topRemoteRoles?: string[];
  insightsSummary?: string;
}

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
