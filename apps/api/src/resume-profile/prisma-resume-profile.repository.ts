import { Injectable } from '@nestjs/common';

import type { MasterCareerProfile } from '../career-profile/career-profile.types';
import { PrismaService } from '../database/prisma.service';
import type { Prisma } from '../generated/prisma/client';
import type { ResumeProfileRepository } from './resume-profile.repository';
import type {
  HighlightRule,
  ResumeOutputFormat,
  ResumeProfile,
  ResumeSection,
  ResumeVersion,
  SelectedRecordIds,
} from './resume-profile.types';

export class ResumeProfileWorkspaceNotFoundError extends Error {}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function toNullableInputJsonValue(
  value: Record<string, unknown> | undefined,
): Prisma.InputJsonValue | undefined {
  return value === undefined ? undefined : toInputJsonValue(value);
}

@Injectable()
export class PrismaResumeProfileRepository implements ResumeProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByWorkspace(workspaceId: string): Promise<ResumeProfile[]> {
    const profiles = await this.prisma.client.resumeProfile.findMany({
      where: { organizationId: workspaceId },
      orderBy: { createdAt: 'asc' },
    });

    return profiles.map((profile) => this.toProfileDomain(profile));
  }

  async findById(
    workspaceId: string,
    profileId: string,
  ): Promise<ResumeProfile | undefined> {
    const profile = await this.prisma.client.resumeProfile.findFirst({
      where: { id: profileId, organizationId: workspaceId },
    });

    return profile ? this.toProfileDomain(profile) : undefined;
  }

  async create(profile: ResumeProfile): Promise<ResumeProfile> {
    return this.prisma.client.$transaction(async (transaction) => {
      await this.assertWorkspaceExists(transaction, profile.workspaceId);

      const created = await transaction.resumeProfile.create({
        data: this.toProfileCreateData(profile),
      });

      return this.toProfileDomain(created);
    });
  }

  async update(profile: ResumeProfile): Promise<ResumeProfile> {
    const updated = await this.prisma.client.resumeProfile.update({
      where: {
        id: profile.id,
        organizationId: profile.workspaceId,
      },
      data: this.toProfileUpdateData(profile),
    });

    return this.toProfileDomain(updated);
  }

  async delete(workspaceId: string, profileId: string): Promise<void> {
    await this.prisma.client.resumeProfile.deleteMany({
      where: { id: profileId, organizationId: workspaceId },
    });
  }

  async listVersions(
    workspaceId: string,
    profileId: string,
  ): Promise<ResumeVersion[]> {
    const versions = await this.prisma.client.resumeVersion.findMany({
      where: { organizationId: workspaceId, resumeProfileId: profileId },
      orderBy: { createdAt: 'desc' },
    });

    return versions.map((version) => this.toVersionDomain(version));
  }

  async findVersionById(
    workspaceId: string,
    profileId: string,
    versionId: string,
  ): Promise<ResumeVersion | undefined> {
    const version = await this.prisma.client.resumeVersion.findFirst({
      where: {
        id: versionId,
        organizationId: workspaceId,
        resumeProfileId: profileId,
      },
    });

    return version ? this.toVersionDomain(version) : undefined;
  }

  async createVersion(version: ResumeVersion): Promise<ResumeVersion> {
    const created = await this.prisma.client.resumeVersion.create({
      data: this.toVersionCreateData(version),
    });

    return this.toVersionDomain(created);
  }

  private async assertWorkspaceExists(
    transaction: Prisma.TransactionClient,
    workspaceId: string,
  ): Promise<void> {
    const workspace = await transaction.organization.findUnique({
      where: { id: workspaceId },
      select: { id: true },
    });

    if (!workspace) {
      throw new ResumeProfileWorkspaceNotFoundError(
        'The workspace does not exist.',
      );
    }
  }

  private toProfileDomain(
    profile: Prisma.ResumeProfileGetPayload<object>,
  ): ResumeProfile {
    return {
      id: profile.id,
      workspaceId: profile.organizationId,
      name: profile.name,
      roleFocus: profile.roleFocus ?? undefined,
      visibleSections: profile.visibleSections as ResumeSection[],
      sectionOrder: profile.sectionOrder as ResumeSection[],
      summaryGuidance: profile.summaryGuidance ?? undefined,
      highlightRules: profile.highlightRules as unknown as HighlightRule[],
      priorityProjectIds: profile.priorityProjectIds,
      prioritySkillIds: profile.prioritySkillIds,
      priorityExperienceIds: profile.priorityExperienceIds,
      priorityAchievementIds: profile.priorityAchievementIds,
      priorityCertificationIds: profile.priorityCertificationIds,
      templateId: profile.templateId ?? undefined,
      styleSettings: profile.styleSettings as unknown as Record<
        string,
        unknown
      >,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  private toVersionDomain(
    version: Prisma.ResumeVersionGetPayload<object>,
  ): ResumeVersion {
    return {
      id: version.id,
      workspaceId: version.organizationId,
      resumeProfileId: version.resumeProfileId,
      targetCompany: version.targetCompany ?? undefined,
      targetRole: version.targetRole ?? undefined,
      masterProfileSnapshot:
        version.masterProfileSnapshot as unknown as MasterCareerProfile,
      selectedRecordIds:
        version.selectedRecordIds as unknown as SelectedRecordIds,
      templateVersion: version.templateVersion ?? undefined,
      outputFormat: this.fromPrismaOutputFormat(version.outputFormat),
      jobAnalysisEvidence: version.jobAnalysisEvidence
        ? (version.jobAnalysisEvidence as unknown as Record<string, unknown>)
        : undefined,
      matchResult: version.matchResult
        ? (version.matchResult as unknown as Record<string, unknown>)
        : undefined,
      confidence: version.confidence ?? undefined,
      explanation: version.explanation ?? undefined,
      artifactMetadata: version.artifactMetadata
        ? (version.artifactMetadata as unknown as Record<string, unknown>)
        : undefined,
      createdAt: version.createdAt.toISOString(),
    };
  }

  private toProfileCreateData(
    profile: ResumeProfile,
  ): Prisma.ResumeProfileCreateInput {
    return {
      id: profile.id,
      name: profile.name,
      roleFocus: profile.roleFocus,
      visibleSections: profile.visibleSections,
      sectionOrder: profile.sectionOrder,
      summaryGuidance: profile.summaryGuidance,
      highlightRules: toInputJsonValue(profile.highlightRules),
      priorityProjectIds: profile.priorityProjectIds,
      prioritySkillIds: profile.prioritySkillIds,
      priorityExperienceIds: profile.priorityExperienceIds,
      priorityAchievementIds: profile.priorityAchievementIds,
      priorityCertificationIds: profile.priorityCertificationIds,
      templateId: profile.templateId,
      styleSettings: toInputJsonValue(profile.styleSettings),
      createdAt: new Date(profile.createdAt),
      updatedAt: new Date(profile.updatedAt),
      organization: { connect: { id: profile.workspaceId } },
    };
  }

  private toProfileUpdateData(
    profile: ResumeProfile,
  ): Prisma.ResumeProfileUpdateInput {
    return {
      name: profile.name,
      roleFocus: profile.roleFocus,
      visibleSections: profile.visibleSections,
      sectionOrder: profile.sectionOrder,
      summaryGuidance: profile.summaryGuidance,
      highlightRules: toInputJsonValue(profile.highlightRules),
      priorityProjectIds: profile.priorityProjectIds,
      prioritySkillIds: profile.prioritySkillIds,
      priorityExperienceIds: profile.priorityExperienceIds,
      priorityAchievementIds: profile.priorityAchievementIds,
      priorityCertificationIds: profile.priorityCertificationIds,
      templateId: profile.templateId,
      styleSettings: toInputJsonValue(profile.styleSettings),
      updatedAt: new Date(profile.updatedAt),
    };
  }

  private toVersionCreateData(
    version: ResumeVersion,
  ): Prisma.ResumeVersionCreateInput {
    return {
      id: version.id,
      organizationId: version.workspaceId,
      targetCompany: version.targetCompany,
      targetRole: version.targetRole,
      masterProfileSnapshot: toInputJsonValue(version.masterProfileSnapshot),
      selectedRecordIds: toInputJsonValue(version.selectedRecordIds),
      templateVersion: version.templateVersion,
      outputFormat: this.toPrismaOutputFormat(version.outputFormat),
      jobAnalysisEvidence: toNullableInputJsonValue(
        version.jobAnalysisEvidence,
      ),
      matchResult: toNullableInputJsonValue(version.matchResult),
      confidence: version.confidence,
      explanation: version.explanation,
      artifactMetadata: toNullableInputJsonValue(version.artifactMetadata),
      createdAt: new Date(version.createdAt),
      resumeProfile: { connect: { id: version.resumeProfileId } },
    };
  }

  private toPrismaOutputFormat(
    outputFormat: ResumeOutputFormat,
  ): 'HTML' | 'LATEX' | 'PDF' {
    switch (outputFormat) {
      case 'html':
        return 'HTML';
      case 'latex':
        return 'LATEX';
      case 'pdf':
        return 'PDF';
    }
  }

  private fromPrismaOutputFormat(
    outputFormat: 'HTML' | 'LATEX' | 'PDF',
  ): ResumeOutputFormat {
    switch (outputFormat) {
      case 'HTML':
        return 'html';
      case 'LATEX':
        return 'latex';
      case 'PDF':
        return 'pdf';
    }
  }
}
