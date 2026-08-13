import { randomUUID } from 'node:crypto';

import { Inject, Injectable, NotFoundException } from '@nestjs/common';

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
    const profiles = await this.resumeProfileRepository.listByWorkspace(
      this.normalizeWorkspaceId(workspaceId),
    );

    return profiles.map((profile) => structuredClone(profile));
  }

  async findById(
    workspaceId: string,
    profileId: string,
  ): Promise<ResumeProfile | undefined> {
    const profile = await this.resumeProfileRepository.findById(
      this.normalizeWorkspaceId(workspaceId),
      this.normalizeProfileId(profileId),
    );

    return profile ? structuredClone(profile) : undefined;
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

    const profile: ResumeProfile = {
      id: randomUUID(),
      workspaceId: normalizedWorkspaceId,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...normalizedInput,
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

    const normalizedInput = this.normalizeInput(input);
    const masterProfile = await this.careerProfileService.findByWorkspace(
      normalizedWorkspaceId,
    );

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
      ...existingProfile,
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
    const profile = await this.resumeProfileRepository.findById(
      this.normalizeWorkspaceId(workspaceId),
      this.normalizeProfileId(profileId),
    );

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
    const masterRecordIds = new Set([
      ...masterProfile.projects.map((record) => record.id),
      ...masterProfile.skills.map((record) => record.id),
      ...masterProfile.experiences.map((record) => record.id),
      ...masterProfile.achievements.map((record) => record.id),
      ...masterProfile.certifications.map((record) => record.id),
    ]);

    const priorityGroups = [
      ['priorityProjectIds', resumeProfile.priorityProjectIds],
      ['prioritySkillIds', resumeProfile.prioritySkillIds],
      ['priorityExperienceIds', resumeProfile.priorityExperienceIds],
      ['priorityAchievementIds', resumeProfile.priorityAchievementIds],
      ['priorityCertificationIds', resumeProfile.priorityCertificationIds],
    ] as const;

    for (const [fieldName, ids] of priorityGroups) {
      for (const id of ids) {
        if (!masterRecordIds.has(id)) {
          throw new ResumeProfileValidationError(
            `${fieldName} contains an ID that is not in the master career profile.`,
          );
        }
      }
    }

    for (const rule of resumeProfile.highlightRules) {
      if (!masterRecordIds.has(rule.recordId)) {
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
