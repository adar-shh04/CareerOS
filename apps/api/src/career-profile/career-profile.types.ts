export type CareerProfileSource =
  | 'user-entered'
  | 'resume-import'
  | 'portfolio-import'
  | 'github-import';

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
  proficiency?: 'foundational' | 'working' | 'advanced' | 'expert';
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
