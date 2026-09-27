import { randomUUID } from 'node:crypto';

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { generateLatexFromProfile } from '@repo/types';

import { CareerProfileService } from '../career-profile/career-profile.service';
import type { MasterCareerProfile } from '../career-profile/career-profile.types';
import {
  RESUME_PROFILE_REPOSITORY,
  type ResumeProfileRepository,
} from './resume-profile.repository';
import {
  type CreateResumeVersionInput,
  type HighlightRule,
  RESUME_SECTIONS,
  type ResumeOutputFormat,
  type ResumeProfile,
  type ResumeProfileInput,
  type ResumeSection,
  type ResumeVersion,
  type SelectedRecordIds,
} from './resume-profile.types';

export class ResumeProfileValidationError extends Error {}

/**
 * Resume Profiles reference Master Career Profile records by id (live
 * references). Editing the Master Profile can remove a referenced record; such
 * references are treated as gone rather than making the Resume Profile
 * unusable. Historical ResumeVersions are unaffected: they carry their own
 * masterProfileSnapshot.
 */
const PRIORITY_FIELDS = [
  'priorityProjectIds',
  'prioritySkillIds',
  'priorityExperienceIds',
  'priorityAchievementIds',
  'priorityCertificationIds',
] as const;

type PriorityField = (typeof PRIORITY_FIELDS)[number];
type ReferenceFields = Pick<ResumeProfile, PriorityField | 'highlightRules'>;

function masterIdsByField(
  master: MasterCareerProfile,
): Record<PriorityField, Set<string>> {
  const ids = (records: { id: string }[]) => new Set(records.map((r) => r.id));
  return {
    priorityProjectIds: ids(master.projects),
    prioritySkillIds: ids(master.skills),
    priorityExperienceIds: ids(master.experiences),
    priorityAchievementIds: ids(master.achievements),
    priorityCertificationIds: ids(master.certifications),
  };
}

function allMasterRecordIds(master: MasterCareerProfile): Set<string> {
  return new Set(
    Object.values(masterIdsByField(master)).flatMap((set) => [...set]),
  );
}

/** Ids a stored profile references that no longer resolve in the master. */
function staleReferenceIds(
  profile: ReferenceFields,
  master: MasterCareerProfile,
): Set<string> {
  const idsByField = masterIdsByField(master);
  const all = allMasterRecordIds(master);
  const stale = new Set<string>();
  for (const field of PRIORITY_FIELDS) {
    for (const id of profile[field]) {
      if (!idsByField[field].has(id)) stale.add(id);
    }
  }
  for (const rule of profile.highlightRules) {
    if (!all.has(rule.recordId)) stale.add(rule.recordId);
  }
  return stale;
}

function withoutIds<T extends ReferenceFields>(
  profile: T,
  ids: Set<string>,
): T {
  if (ids.size === 0) return profile;
  const next = { ...profile };
  for (const field of PRIORITY_FIELDS) {
    next[field] = profile[field].filter((id) => !ids.has(id));
  }
  next.highlightRules = profile.highlightRules.filter(
    (rule) => !ids.has(rule.recordId),
  );
  return next;
}

/** A stored profile as seen against the current master: stale references removed. */
export function pruneStaleReferences(
  profile: ResumeProfile,
  master: MasterCareerProfile | undefined,
): ResumeProfile {
  return master
    ? withoutIds(profile, staleReferenceIds(profile, master))
    : profile;
}

function emptyMasterProfile(workspaceId: string): MasterCareerProfile {
  const now = new Date().toISOString();
  return {
    id: '',
    workspaceId,
    version: 0,
    createdAt: now,
    updatedAt: now,
    identity: { fullName: 'Your Name' },
    education: [],
    experiences: [],
    projects: [],
    achievements: [],
    skills: [],
    technologies: [],
    publications: [],
    hackathons: [],
    certifications: [],
    links: [],
  };
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const resumeSectionSet = new Set<string>(RESUME_SECTIONS);

@Injectable()
export class ResumeProfileService {
  constructor(
    @Inject(RESUME_PROFILE_REPOSITORY)
    private readonly resumeProfileRepository: ResumeProfileRepository,
    private readonly careerProfileService: CareerProfileService,
  ) {}

  async listByWorkspace(workspaceId: string): Promise<ResumeProfile[]> {
    const normalizedWorkspaceId = this.normalizeWorkspaceId(workspaceId);
    const [profiles, masterProfile] = await Promise.all([
      this.resumeProfileRepository.listByWorkspace(normalizedWorkspaceId),
      this.careerProfileService.findByWorkspace(normalizedWorkspaceId),
    ]);

    return profiles.map((profile) =>
      structuredClone(pruneStaleReferences(profile, masterProfile)),
    );
  }

  async findById(
    workspaceId: string,
    profileId: string,
  ): Promise<ResumeProfile | undefined> {
    const normalizedWorkspaceId = this.normalizeWorkspaceId(workspaceId);
    const [profile, masterProfile] = await Promise.all([
      this.resumeProfileRepository.findById(
        normalizedWorkspaceId,
        this.normalizeProfileId(profileId),
      ),
      this.careerProfileService.findByWorkspace(normalizedWorkspaceId),
    ]);

    return profile
      ? structuredClone(pruneStaleReferences(profile, masterProfile))
      : undefined;
  }

  async create(
    workspaceId: string,
    input: ResumeProfileInput,
  ): Promise<ResumeProfile> {
    const normalizedWorkspaceId = this.normalizeWorkspaceId(workspaceId);
    const normalizedInput = this.normalizeInput(input);
    const masterProfile = await this.careerProfileService.findByWorkspace(
      normalizedWorkspaceId,
    );

    if (masterProfile) {
      this.validatePriorityIdsAgainstMaster(
        {
          ...normalizedInput,
          id: '',
          workspaceId: normalizedWorkspaceId,
          createdAt: '',
          updatedAt: '',
        },
        masterProfile,
      );
    }

    const timestamp = new Date().toISOString();
    // Canonical CareerOS LaTeX (shared contract in @repo/types). Without a
    // master profile yet, only the empty template with a name placeholder.
    const defaultLatex = generateLatexFromProfile(
      masterProfile ?? emptyMasterProfile(normalizedWorkspaceId),
      normalizedInput,
    );

    const profile: ResumeProfile = {
      id: randomUUID(),
      workspaceId: normalizedWorkspaceId,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...normalizedInput,
      latexSource: normalizedInput.latexSource ?? defaultLatex,
    };

    return structuredClone(await this.resumeProfileRepository.create(profile));
  }

  async update(
    workspaceId: string,
    profileId: string,
    input: ResumeProfileInput,
  ): Promise<ResumeProfile> {
    const normalizedWorkspaceId = this.normalizeWorkspaceId(workspaceId);
    const normalizedProfileId = this.normalizeProfileId(profileId);
    const existingProfile = await this.resumeProfileRepository.findById(
      normalizedWorkspaceId,
      normalizedProfileId,
    );

    if (!existingProfile) {
      throw new NotFoundException('Resume profile not found.');
    }

    const masterProfile = await this.careerProfileService.findByWorkspace(
      normalizedWorkspaceId,
    );
    // References that were already stored but whose Master Profile records
    // have since been removed are dropped (clients may echo them back);
    // anything else that does not resolve is still rejected below.
    const staleIds = masterProfile
      ? staleReferenceIds(existingProfile, masterProfile)
      : new Set<string>();
    const normalizedInput = withoutIds(this.normalizeInput(input), staleIds);

    if (masterProfile) {
      this.validatePriorityIdsAgainstMaster(
        {
          ...normalizedInput,
          id: existingProfile.id,
          workspaceId: existingProfile.workspaceId,
          createdAt: existingProfile.createdAt,
          updatedAt: existingProfile.updatedAt,
        },
        masterProfile,
      );
    }

    const timestamp = new Date().toISOString();

    const profile: ResumeProfile = {
      ...withoutIds(existingProfile, staleIds),
      ...normalizedInput,
      id: existingProfile.id,
      workspaceId: existingProfile.workspaceId,
      createdAt: existingProfile.createdAt,
      updatedAt: timestamp,
    };

    return structuredClone(await this.resumeProfileRepository.update(profile));
  }

  async delete(workspaceId: string, profileId: string): Promise<void> {
    const normalizedWorkspaceId = this.normalizeWorkspaceId(workspaceId);
    const normalizedProfileId = this.normalizeProfileId(profileId);
    const existingProfile = await this.resumeProfileRepository.findById(
      normalizedWorkspaceId,
      normalizedProfileId,
    );

    if (!existingProfile) {
      throw new NotFoundException('Resume profile not found.');
    }

    await this.resumeProfileRepository.delete(
      normalizedWorkspaceId,
      normalizedProfileId,
    );
  }

  async listVersions(
    workspaceId: string,
    profileId: string,
  ): Promise<ResumeVersion[]> {
    await this.requireProfile(workspaceId, profileId);

    const versions = await this.resumeProfileRepository.listVersions(
      this.normalizeWorkspaceId(workspaceId),
      this.normalizeProfileId(profileId),
    );

    return versions.map((version) => structuredClone(version));
  }

  async createVersion(
    workspaceId: string,
    profileId: string,
    input: CreateResumeVersionInput,
  ): Promise<ResumeVersion> {
    const normalizedWorkspaceId = this.normalizeWorkspaceId(workspaceId);
    const normalizedProfileId = this.normalizeProfileId(profileId);
    const resumeProfile = await this.requireProfile(
      normalizedWorkspaceId,
      normalizedProfileId,
    );
    const masterProfile = await this.careerProfileService.findByWorkspace(
      normalizedWorkspaceId,
    );

    if (!masterProfile) {
      throw new ResumeProfileValidationError(
        'A master career profile is required before creating a resume version.',
      );
    }

    this.validatePriorityIdsAgainstMaster(resumeProfile, masterProfile);

    const selectedRecordIds =
      input.selectedRecordIds ?? this.buildSelectedRecordIds(resumeProfile);
    const timestamp = new Date().toISOString();

    const version: ResumeVersion = {
      id: randomUUID(),
      workspaceId: normalizedWorkspaceId,
      resumeProfileId: normalizedProfileId,
      targetCompany: this.trimOptional(input.targetCompany),
      targetRole: this.trimOptional(input.targetRole),
      masterProfileSnapshot: structuredClone(masterProfile),
      selectedRecordIds,
      templateVersion: this.trimOptional(input.templateVersion),
      outputFormat: this.normalizeOutputFormat(input.outputFormat),
      jobAnalysisEvidence: input.jobAnalysisEvidence
        ? structuredClone(input.jobAnalysisEvidence)
        : undefined,
      matchResult: input.matchResult
        ? structuredClone(input.matchResult)
        : undefined,
      confidence: input.confidence,
      explanation: this.trimOptional(input.explanation),
      artifactMetadata: input.artifactMetadata
        ? structuredClone(input.artifactMetadata)
        : undefined,
      createdAt: timestamp,
    };

    return structuredClone(
      await this.resumeProfileRepository.createVersion(version),
    );
  }

  async findVersionById(
    workspaceId: string,
    profileId: string,
    versionId: string,
  ): Promise<ResumeVersion | undefined> {
    await this.requireProfile(workspaceId, profileId);

    const version = await this.resumeProfileRepository.findVersionById(
      this.normalizeWorkspaceId(workspaceId),
      this.normalizeProfileId(profileId),
      this.normalizeVersionId(versionId),
    );

    return version ? structuredClone(version) : undefined;
  }

  private async requireProfile(
    workspaceId: string,
    profileId: string,
  ): Promise<ResumeProfile> {
    const profile = await this.findById(workspaceId, profileId);

    if (!profile) {
      throw new NotFoundException('Resume profile not found.');
    }

    return profile;
  }

  private buildSelectedRecordIds(
    resumeProfile: ResumeProfile,
  ): SelectedRecordIds {
    return {
      projectIds: [...resumeProfile.priorityProjectIds],
      skillIds: [...resumeProfile.prioritySkillIds],
      experienceIds: [...resumeProfile.priorityExperienceIds],
      achievementIds: [...resumeProfile.priorityAchievementIds],
      certificationIds: [...resumeProfile.priorityCertificationIds],
    };
  }

  private validatePriorityIdsAgainstMaster(
    resumeProfile: ResumeProfile,
    masterProfile: MasterCareerProfile,
  ): void {
    // Each priority list may only reference records of its own type.
    const idsByField = masterIdsByField(masterProfile);
    for (const field of PRIORITY_FIELDS) {
      for (const id of resumeProfile[field]) {
        if (!idsByField[field].has(id)) {
          throw new ResumeProfileValidationError(
            `${field} contains an ID that is not in the master career profile.`,
          );
        }
      }
    }

    const allMasterIds = allMasterRecordIds(masterProfile);
    for (const rule of resumeProfile.highlightRules) {
      if (!allMasterIds.has(rule.recordId)) {
        throw new ResumeProfileValidationError(
          'highlightRules contains an ID that is not in the master career profile.',
        );
      }
    }
  }

  private trimOptional(value: string | undefined): string | undefined {
    const trimmed = value?.trim();

    if (!trimmed) {
      return undefined;
    }

    return trimmed;
  }

  private normalizeWorkspaceId(workspaceId: string): string {
    const normalizedWorkspaceId = workspaceId.trim();

    if (!normalizedWorkspaceId) {
      throw new ResumeProfileValidationError('workspaceId is required.');
    }

    if (!uuidPattern.test(normalizedWorkspaceId)) {
      throw new ResumeProfileValidationError('workspaceId must be a UUID.');
    }

    return normalizedWorkspaceId;
  }

  private normalizeProfileId(profileId: string): string {
    const normalizedProfileId = profileId.trim();

    if (!normalizedProfileId) {
      throw new ResumeProfileValidationError('profileId is required.');
    }

    if (!uuidPattern.test(normalizedProfileId)) {
      throw new ResumeProfileValidationError('profileId must be a UUID.');
    }

    return normalizedProfileId;
  }

  private normalizeVersionId(versionId: string): string {
    const normalizedVersionId = versionId.trim();

    if (!normalizedVersionId) {
      throw new ResumeProfileValidationError('versionId is required.');
    }

    if (!uuidPattern.test(normalizedVersionId)) {
      throw new ResumeProfileValidationError('versionId must be a UUID.');
    }

    return normalizedVersionId;
  }

  private normalizeInput(
    input: ResumeProfileInput,
  ): Omit<ResumeProfile, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'> {
    const profile = structuredClone(input);
    const name = profile.name.trim();

    if (!name) {
      throw new ResumeProfileValidationError('name is required.');
    }

    return {
      name,
      roleFocus: this.trimOptional(profile.roleFocus),
      visibleSections: this.normalizeSections(profile.visibleSections ?? []),
      sectionOrder: this.normalizeSections(profile.sectionOrder ?? []),
      summaryGuidance: this.trimOptional(profile.summaryGuidance),
      highlightRules: this.normalizeHighlightRules(
        profile.highlightRules ?? [],
      ),
      priorityProjectIds: this.normalizeUuidList(profile.priorityProjectIds),
      prioritySkillIds: this.normalizeUuidList(profile.prioritySkillIds),
      priorityExperienceIds: this.normalizeUuidList(
        profile.priorityExperienceIds,
      ),
      priorityAchievementIds: this.normalizeUuidList(
        profile.priorityAchievementIds,
      ),
      priorityCertificationIds: this.normalizeUuidList(
        profile.priorityCertificationIds,
      ),
      templateId: this.trimOptional(profile.templateId),
      styleSettings: profile.styleSettings ?? {},
      latexSource: this.trimOptional(profile.latexSource),
    };
  }

  private normalizeSections(sections: ResumeSection[]): ResumeSection[] {
    const normalizedSections = sections.filter((section) =>
      resumeSectionSet.has(section),
    );

    if (normalizedSections.length !== sections.length) {
      throw new ResumeProfileValidationError(
        'visibleSections and sectionOrder must use supported resume sections.',
      );
    }

    return normalizedSections;
  }

  private normalizeHighlightRules(rules: HighlightRule[]): HighlightRule[] {
    return rules.map((rule) => {
      if (!uuidPattern.test(rule.recordId)) {
        throw new ResumeProfileValidationError(
          'highlightRules.recordId must be a UUID.',
        );
      }

      return {
        recordId: rule.recordId,
        emphasis: rule.emphasis,
        keywordHints: rule.keywordHints
          ?.map((hint) => hint.trim())
          .filter(Boolean),
      };
    });
  }

  private normalizeUuidList(ids: string[] | undefined): string[] {
    const normalizedIds = ids ?? [];

    if (normalizedIds.some((id) => !uuidPattern.test(id))) {
      throw new ResumeProfileValidationError(
        'Priority record IDs must be UUIDs.',
      );
    }

    return normalizedIds;
  }

  private normalizeOutputFormat(
    outputFormat: ResumeOutputFormat | undefined,
  ): ResumeOutputFormat {
    if (!outputFormat) {
      return 'html';
    }

    if (!['html', 'latex', 'pdf'].includes(outputFormat)) {
      throw new ResumeProfileValidationError(
        'outputFormat must be html, latex, or pdf.',
      );
    }

    return outputFormat;
  }
}
