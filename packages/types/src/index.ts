export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
}

export interface AuthWorkspace {
  id: string;
  name: string;
  slug: string;
}

export interface AuthSession {
  user: AuthUser;
  workspace: AuthWorkspace;
  needsOnboarding: boolean;
}

export type ByokProvider = "openai" | "anthropic" | "google" | "mistral";

export interface ByokCredentialSummary {
  provider: ByokProvider;
  configured: boolean;
  maskedKey: string | null;
  updatedAt: string;
}

/* ── Canonical Master Career Profile Types ────────────────────────────── */

export type CareerProfileSource =
  | "user-entered"
  | "resume-import"
  | "portfolio-import"
  | "github-import";

export interface CareerRecord {
  id: string;
  source?: CareerProfileSource;
  sourceReference?: string;
}

export interface CareerLink extends CareerRecord {
  label: string;
  url: string;
}

export interface CareerIdentity {
  fullName: string;
  headline?: string;
  location?: string;
  email?: string;
}

export interface EducationEntry extends CareerRecord {
  institution: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  highlights?: string[];
}

export interface ExperienceEntry extends CareerRecord {
  company: string;
  title: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  bullets?: string[];
  technologies?: string[];
}

export interface ProjectEntry extends CareerRecord {
  name: string;
  description?: string;
  url?: string;
  repositoryUrl?: string;
  bullets?: string[];
  technologies?: string[];
}

export interface AchievementEntry extends CareerRecord {
  title: string;
  description?: string;
  date?: string;
}

export interface SkillEntry extends CareerRecord {
  name: string;
  category?: string;
  proficiency?: "foundational" | "working" | "advanced" | "expert";
}

export interface TechnologyEntry extends CareerRecord {
  name: string;
  category?: string;
}

export interface PublicationEntry extends CareerRecord {
  title: string;
  publisher?: string;
  date?: string;
  url?: string;
}

export interface HackathonEntry extends CareerRecord {
  name: string;
  organizer?: string;
  date?: string;
  achievement?: string;
}

export interface CertificationEntry extends CareerRecord {
  name: string;
  issuer?: string;
  issueDate?: string;
  expirationDate?: string;
  credentialUrl?: string;
}

export interface MasterCareerProfileInput {
  identity: CareerIdentity;
  education?: EducationEntry[];
  experiences?: ExperienceEntry[];
  projects?: ProjectEntry[];
  achievements?: AchievementEntry[];
  skills?: SkillEntry[];
  technologies?: TechnologyEntry[];
  publications?: PublicationEntry[];
  hackathons?: HackathonEntry[];
  certifications?: CertificationEntry[];
  links?: CareerLink[];
}

export interface MasterCareerProfile extends MasterCareerProfileInput {
  id: string;
  workspaceId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  education: EducationEntry[];
  experiences: ExperienceEntry[];
  projects: ProjectEntry[];
  achievements: AchievementEntry[];
  skills: SkillEntry[];
  technologies: TechnologyEntry[];
  publications: PublicationEntry[];
  hackathons: HackathonEntry[];
  certifications: CertificationEntry[];
  links: CareerLink[];
}

/* ── Resume Profiles & Version Types ──────────────────────────────────── */

export type ResumeSection =
  | "identity"
  | "summary"
  | "experience"
  | "projects"
  | "education"
  | "skills"
  | "technologies"
  | "achievements"
  | "certifications"
  | "publications"
  | "hackathons"
  | "links";

export type ResumeOutputFormat = "html" | "latex" | "pdf";
export type HighlightEmphasis = "primary" | "secondary";

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

export interface JobOpportunity {
  id: string;
  title: string;
  company: string;
  location: string;
  isRemote: boolean;
  matchScore: number;
  whyFits: string;
  requiredSkills: string[];
  missingSkills: string[];
  salaryRange?: string;
  postedAt: string;
}

export interface AIRecommendation {
  id: string;
  type: "ResumeBullet" | "SkillBridge" | "OutreachStrategy" | "InterviewPrep";
  title: string;
  reasoning: string;
  confidenceScore: number;
  impactLevel: "High Impact" | "Medium Impact" | "Quick Win";
  actionable: boolean;
  userDismissed: boolean;
}
