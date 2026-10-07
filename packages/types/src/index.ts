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
  latexSource?: string;
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
  latexSource?: string;
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

/* ── Canonical Job Domain Types ───────────────────────────────────────── */

export interface ExperienceRequirements {
  minYears?: number;
  maxYears?: number;
  text?: string;
}

/** Canonical job record ingested from a source adapter. Not workspace-owned;
 * shared across workspaces. Workspace-specific concerns live in WorkspaceJobState. */
export interface CanonicalJob {
  id: string;
  externalId?: string;
  fingerprint?: string;
  /** Identifier for the source adapter that produced this job (e.g. "manual", "linkedin-apify"). */
  source: string;
  sourceUrl?: string;
  company: string;
  title: string;
  location: string;
  isRemote: boolean;
  remotePolicy?: "REMOTE" | "HYBRID" | "ONSITE";
  /** Normalized seniority persisted at ingestion. Absent = not stated / unknown. */
  seniority?: string;
  /** Normalized experience requirement persisted at ingestion. Absent = not stated. */
  experienceRequirements?: ExperienceRequirements;
  /**
   * True when the job went through the normalization pipeline, so an absent
   * seniority/experienceRequirements means "not stated" rather than "legacy job
   * never normalized".
   */
  isNormalized?: boolean;
  employmentType?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryRange?: string;
  description?: string;
  requiredSkills: string[];
  preferredSkills: string[];
  postedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Workspace-specific interaction state for a canonical job.
 * Separated from the canonical record to preserve multi-tenancy boundaries. */
/**
 * Derived Job Radar status (never set directly):
 * "applied" if the workspace's Application is in an applied stage, else
 * "dismissed" / "saved" from the isDismissed / isSaved flags, else "discovered".
 * Pipeline stages (interview, offer, …) live on the Application only.
 */
export type WorkspaceJobStatus =
  | "discovered"
  | "saved"
  | "applied"
  | "dismissed";

export interface WorkspaceJobState {
  id: string;
  workspaceId: string;
  jobId: string;
  status: WorkspaceJobStatus;
  isSaved: boolean;
  isDismissed: boolean;
  notes?: string;
  appliedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Per-dimension raw scores (0–1 range each).
 * Weights used to combine them are configurable — see JobMatchingWeights. */
export interface JobMatchDimensionScores {
  skill: number;
  role: number;
  experience: number;
  location: number;
  seniority: number;
}

/** Concrete evidence backing the deterministic match — used in explanations. */
export interface JobMatchEvidence {
  /** Required skills the profile has. */
  matchedSkills: string[];
  /** Required skills the profile does not have. */
  missingSkills: string[];
  /** Preferred skills the profile has. */
  matchedPreferredSkills: string[];
  /** Preferred skills the profile does not have (absent on legacy matches). */
  missingPreferredSkills?: string[];
  profileSkillCount: number;
  requiredSkillCount: number;
  experienceYears: number;
  /** Job seniority used for scoring and where it came from. */
  jobSeniority?: string;
  jobSenioritySource?: "normalized" | "inferred_from_title" | "unknown";
  /** Years of experience the job requires and where it came from. */
  requiredYears?: number;
  requiredYearsSource?: "normalized" | "unknown";
}

/** Persisted match result for a job × workspace × resume-profile combination.
 * The unique index is (workspaceId, jobId, resumeProfileId). */
export interface JobMatchResult {
  id: string;
  jobId: string;
  workspaceId: string;
  /** Null/absent means the match was against the raw MasterCareerProfile, not a specific ResumeProfile. */
  resumeProfileId?: string;
  overallScore: number;
  dimensionScores: JobMatchDimensionScores;
  matchedSkills: string[];
  missingSkills: string[];
  /** 0–1 confidence derived from profile completeness and data coverage. */
  confidence: number;
  /** Human-readable explanation derived deterministically from profile + job data. Never LLM-generated here. */
  explanation: string;
  evidence: JobMatchEvidence;
  profileVersion?: number;
  createdAt: string;
  updatedAt: string;
}

/** Configurable scoring weights for the deterministic matching engine.
 * Values should sum to 1.0. Adjust per-workspace or globally via config. */
export interface JobMatchingWeights {
  skill: number;
  role: number;
  experience: number;
  location: number;
  seniority: number;
}

/** Sensible defaults: skills dominate (40%), role is second (25%), then experience, location, seniority. */
export const DEFAULT_MATCHING_WEIGHTS: JobMatchingWeights = {
  skill: 0.4,
  role: 0.25,
  experience: 0.2,
  location: 0.1,
  seniority: 0.05,
};

/** Enriched UI representation of a job returned to the frontend.
 * Canonical job data merged with workspace interaction state and match result. */
export interface JobOpportunity {
  id: string;
  title: string;
  company: string;
  location: string;
  isRemote: boolean;
  remotePolicy?: string;
  seniority?: string;
  experienceRequirements?: ExperienceRequirements;
  employmentType?: string;
  salaryRange?: string;
  description?: string;
  requiredSkills: string[];
  preferredSkills: string[];
  postedAt?: string;
  source: string;
  sourceUrl?: string;
  /** Legacy/convenience fields populated from match result for UI rendering */
  matchScore?: number;
  whyFits?: string;
  missingSkills?: string[];
  matchEvidence?: {
    skillScore: number;
    roleScore: number;
    experienceScore: number;
    locationScore: number;
    seniorityScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    reasons: string[];
    confidence: number;
  };
  /** Present when a match has been calculated for this workspace / profile. */
  match?: {
    overallScore: number;
    dimensionScores: JobMatchDimensionScores;
    matchedSkills: string[];
    missingSkills: string[];
    confidence: number;
    explanation: string;
    evidence: JobMatchEvidence;
    profileVersion?: number;
    /** Resume Profile this match was scored against; absent for the Master Career Profile match. */
    resumeProfileId?: string;
    /** Matching algorithm version that produced this score. */
    matcherVersion?: number;
    /** When this score was computed (ISO). */
    computedAt?: string;
  };
  /** Workspace-scoped interaction state. Absent when no state record exists. */
  workspaceState?: {
    status: WorkspaceJobStatus;
    isSaved: boolean;
    isDismissed: boolean;
    notes?: string;
    appliedAt?: string;
  };
}

export interface JobAnalysisResult {
  jobId: string;
  role: string;
  /** Resolved job seniority, or "Not specified" when the posting gives none. */
  seniority: string;
  senioritySource?: "normalized" | "inferred_from_title" | "unknown";
  experienceRequirements?: ExperienceRequirements;
  locationPolicy: {
    location: string;
    isRemote: boolean;
    remotePolicy?: string;
  };
  skills: {
    requiredSkills: string[];
    preferredSkills: string[];
    /** Required skills the profile has. */
    matchedSkills: string[];
    /** Required skills the profile does not have. */
    missingSkills: string[];
    /** Preferred skills the profile has. */
    matchedPreferredSkills?: string[];
    skillMatchPercentage: number;
  };
  gaps: {
    missingRequiredSkills: string[];
    missingPreferredSkills: string[];
    experienceGap?: string;
    /** "unknown" when the posting states no years-of-experience requirement. */
    seniorityAlignment:
      | "aligned"
      | "under_qualified"
      | "over_qualified"
      | "unknown";
  };
  targetingRecommendations: {
    prioritySkillNames: string[];
    recommendedSectionOrder: ResumeSection[];
    suggestedFocus: string;
  };
  analyzedAt: string;
}

export type ResumeSectionType =
  | "summary"
  | "skills"
  | "experience"
  | "projects"
  | "education"
  | "certifications";

export interface AICoachSectionRecommendation {
  id: string;
  section: ResumeSectionType;
  title: string;
  reasoning: string;
  currentContent?: string;
  recommendedContent: string;
  status: "pending" | "accepted" | "rejected";
  /** Only set when a real score exists; never a placeholder. */
  confidenceScore?: number;
  impact?: "High" | "Medium" | "Low";
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

/* ── Substantive Onboarding Domain Types ──────────────────────────────── */

export interface OnboardingProfileInput {
  name: string;
  workspaceName: string;
  field: string;
  careerDirection?: string;
  targetRole: string;
  experienceLevel?: "entry" | "mid" | "senior" | "lead" | "executive";
  locationPreference?: string;
  workArrangement?: "remote" | "hybrid" | "onsite" | "any";
  skills?: string[];
  jobSearchPreferences?: {
    salaryTarget?: string;
    employmentType?: string;
    activelyLooking?: boolean;
  };
}

/* ── Job Ingestion Types ──────────────────────────────────────────────── */

export interface IngestJobsParams {
  query?: string;
  location?: string;
  limit?: number;
  source?: string;
}

export interface JobIngestionResult {
  source: string;
  fetchedCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  jobs: JobOpportunity[];
}

/* ── Market Intelligence & Career Handbook Types ──────────────────────── */

/**
 * Why an AI-backed result is unavailable. Lets the UI tell "configure a
 * provider" apart from "the provider failed" or "the reply was unusable".
 */
export type AiFailureReason =
  | "not_configured"
  | "provider_error"
  | "invalid_response"
  | "no_data";

/** How many sampled ingested listings require a skill (real counts, not estimates). */
export interface SkillDemand {
  skill: string;
  jobCount: number;
}

export interface MarketIntelligenceResponse {
  /** True only when the AI synthesis succeeded. */
  available: boolean;
  reason?: string;
  failureReason?: AiFailureReason;
  jobDataCount?: number;
  /** Number of most recent ingested listings the aggregates below were computed from. */
  sampleSize?: number;
  topRequiredSkills?: string[];
  skillDemand?: SkillDemand[];
  topRemoteRoles?: string[];
  insightsSummary?: string;
}

export interface HandbookStudyResource {
  title: string;
  url: string;
  description: string;
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
  studyResources: HandbookStudyResource[];
}

export interface CareerHandbookResponse {
  careerPaths: HandbookCareerPath[];
}

/* ── AI Coach Extended Domain Types ───────────────────────────────────── */

export type AiCoachSection =
  | "summary"
  | "experience"
  | "projects"
  | "skills"
  | "education";

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

/** Section coaching result: a validated AI recommendation, or an explicit failure. */
export interface SectionCoachingResponse {
  available: boolean;
  message?: string;
  failureReason?: AiFailureReason;
  recommendation?: SectionRecommendation;
}

export interface AiCoachAnalysisResponse {
  available: boolean;
  message?: string;
  failureReason?: AiFailureReason;
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

/* ── Canonical Application Domain Types ─────────────────────────────── */

export const APPLICATION_STATUSES = [
  "saved",
  "applied",
  "screening",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface ApplicationJobSummary<TDate = string | Date> {
  id: string;
  title: string;
  company: string;
  location: string;
  isRemote: boolean;
  salaryRange?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  source: string;
  sourceUrl?: string | null;
  postedAt?: TDate | null;
  requiredSkills: string[];
}

export interface ApplicationRecord<TDate = string | Date> {
  id: string;
  organizationId: string;
  jobId: string;
  status: ApplicationStatus;
  notes?: string | null;
  appliedAt?: TDate | null;
  resumeProfileId?: string | null;
  resumeVersionId?: string | null;
  createdAt: TDate;
  updatedAt: TDate;
  job?: ApplicationJobSummary<TDate> | null;
}

export interface ApplicationStatusHistoryRecord<TDate = string | Date> {
  id: string;
  applicationId: string;
  status: ApplicationStatus;
  notes?: string | null;
  createdAt: TDate;
}

export interface CreateApplicationInput<TDate = string | Date> {
  jobId: string;
  status?: ApplicationStatus;
  notes?: string;
  appliedAt?: TDate;
  resumeProfileId?: string;
  resumeVersionId?: string;
}

export interface UpdateApplicationInput<TDate = string | Date> {
  status?: ApplicationStatus;
  notes?: string;
  appliedAt?: TDate | null;
  resumeProfileId?: string;
  resumeVersionId?: string;
}

export interface MarkAppliedInput<TDate = string | Date> {
  resumeProfileId?: string;
  notes?: string;
  appliedAt?: TDate;
}

export interface ApplicationStats {
  total: number;
  saved: number;
  applied: number;
  interviewing: number;
  offers: number;
}

export * from "./latex.js";
export * from "./onboarding.js";
