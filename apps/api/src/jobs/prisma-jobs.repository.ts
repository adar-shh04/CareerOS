import { Injectable } from '@nestjs/common';
import type {
  CanonicalJob,
  JobMatchEvidence,
  WorkspaceJobState,
  WorkspaceJobStatus,
} from '@repo/types';

import { PrismaService } from '../database/prisma.service';
import type {
  Job,
  JobMatch,
  Prisma,
  WorkspaceJobState as PrismaWorkspaceJobState,
} from '../generated/prisma/client';
import type {
  CreateJobInput,
  ListJobsQuery,
  MatchOutput,
  StoredJobMatch,
} from './jobs.types';

/** Prisma-backed repository for canonical jobs, workspace job states, and job matches. */
@Injectable()
export class PrismaJobsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Canonical Jobs ─────────────────────────────────────────────────────

  /**
   * Upsert a canonical job by (source, externalId) or by fingerprint.
   * If externalId is absent but fingerprint is present, deduplicates by fingerprint.
   */
  async upsertCanonicalJob(input: CreateJobInput): Promise<CanonicalJob> {
    const data = {
      source: input.source ?? 'manual',
      sourceUrl: input.sourceUrl ?? null,
      company: input.company,
      title: input.title,
      location: input.location,
      fingerprint: input.fingerprint ?? null,
      isRemote: input.isRemote ?? false,
      remotePolicy: input.remotePolicy ?? null,
      employmentType: input.employmentType ?? null,
      salaryMin: input.salaryMin ?? null,
      salaryMax: input.salaryMax ?? null,
      salaryCurrency: input.salaryCurrency ?? null,
      salaryRange: input.salaryRange ?? null,
      description: input.description ?? null,
      requiredSkills: input.requiredSkills ?? [],
      preferredSkills: input.preferredSkills ?? [],
      postedAt: input.postedAt ?? null,
      expiresAt: input.expiresAt ?? null,
    };

    if (input.externalId) {
      const row = await this.prisma.client.job.upsert({
        where: {
          source_externalId: {
            source: data.source,
            externalId: input.externalId,
          },
        },
        update: data,
        create: { ...data, externalId: input.externalId },
      });
      return this.mapJob(row);
    }

    if (input.fingerprint) {
      const existing = await this.prisma.client.job.findUnique({
        where: { fingerprint: input.fingerprint },
      });
      if (existing) {
        const row = await this.prisma.client.job.update({
          where: { id: existing.id },
          data,
        });
        return this.mapJob(row);
      }
    }

    const row = await this.prisma.client.job.create({ data });
    return this.mapJob(row);
  }

  /** List canonical jobs. Optionally filter by text query, remote, or a single skill. */
  async listJobs(query: ListJobsQuery = {}): Promise<CanonicalJob[]> {
    const { query: q, remoteOnly, skill, limit = 50, offset = 0 } = query;

    const rows = await this.prisma.client.job.findMany({
      where: {
        ...(remoteOnly ? { isRemote: true } : {}),
        ...(skill
          ? {
              OR: [
                { requiredSkills: { has: skill } },
                { preferredSkills: { has: skill } },
              ],
            }
          : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { company: { contains: q, mode: 'insensitive' } },
                { location: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { postedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return rows.map((r) => this.mapJob(r));
  }

  async findJobById(id: string): Promise<CanonicalJob | null> {
    const row = await this.prisma.client.job.findUnique({ where: { id } });
    return row ? this.mapJob(row) : null;
  }

  async findJobBySourceOrFingerprint(
    source: string,
    externalId?: string,
    fingerprint?: string,
  ): Promise<CanonicalJob | null> {
    if (externalId) {
      const existing = await this.prisma.client.job.findUnique({
        where: {
          source_externalId: { source, externalId },
        },
      });
      if (existing) return this.mapJob(existing);
    }

    if (fingerprint) {
      const existing = await this.prisma.client.job.findUnique({
        where: { fingerprint },
      });
      if (existing) return this.mapJob(existing);
    }

    return null;
  }

  // ── Job Matches ────────────────────────────────────────────────────────

  /**
   * Upsert a persisted job match.
   * When resumeProfileId is provided, matches are keyed by (organizationId, jobId, resumeProfileId).
   * When resumeProfileId is null/undefined, match is profile-agnostic (raw MasterCareerProfile).
   */
  async upsertJobMatch(
    jobId: string,
    workspaceId: string,
    output: MatchOutput,
    resumeProfileId?: string,
    profileVersion?: number,
  ): Promise<StoredJobMatch> {
    const data = {
      overallScore: output.overallScore,
      skillScore: output.dimensionScores.skill,
      roleScore: output.dimensionScores.role,
      experienceScore: output.dimensionScores.experience,
      locationScore: output.dimensionScores.location,
      seniorityScore: output.dimensionScores.seniority,
      matchedSkills: output.matchedSkills,
      missingSkills: output.missingSkills,
      confidence: output.confidence,
      explanation: output.explanation,
      evidence: output.evidence as unknown as Prisma.InputJsonValue,
      profileVersion: profileVersion ?? null,
    };

    if (resumeProfileId) {
      const row = await this.prisma.client.jobMatch.upsert({
        where: {
          organizationId_jobId_resumeProfileId: {
            organizationId: workspaceId,
            jobId,
            resumeProfileId,
          },
        },
        update: data,
        create: {
          jobId,
          organizationId: workspaceId,
          resumeProfileId,
          ...data,
        },
      });
      return this.mapMatch(row);
    }

    const existing = await this.prisma.client.jobMatch.findFirst({
      where: {
        organizationId: workspaceId,
        jobId,
        resumeProfileId: null,
      },
    });

    if (existing) {
      const row = await this.prisma.client.jobMatch.update({
        where: { id: existing.id },
        data,
      });
      return this.mapMatch(row);
    }

    const row = await this.prisma.client.jobMatch.create({
      data: {
        jobId,
        organizationId: workspaceId,
        resumeProfileId: null,
        ...data,
      },
    });

    return this.mapMatch(row);
  }

  /** Load an existing match for a job × workspace × profile combination. */
  async findJobMatch(
    jobId: string,
    workspaceId: string,
    resumeProfileId?: string,
  ): Promise<StoredJobMatch | null> {
    if (resumeProfileId) {
      const row = await this.prisma.client.jobMatch.findUnique({
        where: {
          organizationId_jobId_resumeProfileId: {
            organizationId: workspaceId,
            jobId,
            resumeProfileId,
          },
        },
      });
      return row ? this.mapMatch(row) : null;
    }

    const row = await this.prisma.client.jobMatch.findFirst({
      where: {
        organizationId: workspaceId,
        jobId,
        resumeProfileId: null,
      },
    });
    return row ? this.mapMatch(row) : null;
  }

  /** Load all stored matches for a workspace, optionally filtered by resumeProfileId. */
  async listJobMatchesForWorkspace(
    workspaceId: string,
    resumeProfileId?: string,
  ): Promise<StoredJobMatch[]> {
    const rows = await this.prisma.client.jobMatch.findMany({
      where: {
        organizationId: workspaceId,
        ...(resumeProfileId !== undefined
          ? { resumeProfileId }
          : { resumeProfileId: null }),
      },
      orderBy: { overallScore: 'desc' },
    });
    return rows.map((r) => this.mapMatch(r));
  }

  // ── Workspace Job State ────────────────────────────────────────────────

  /** Retrieve workspace-scoped state for a single job. */
  async findWorkspaceJobState(
    workspaceId: string,
    jobId: string,
  ): Promise<WorkspaceJobState | null> {
    const row = await this.prisma.client.workspaceJobState.findUnique({
      where: {
        organizationId_jobId: {
          organizationId: workspaceId,
          jobId,
        },
      },
    });
    return row ? this.mapWorkspaceJobState(row) : null;
  }

  /** Upsert workspace-scoped interaction state (save, dismiss, restore, notes, status). */
  async upsertWorkspaceJobState(
    workspaceId: string,
    jobId: string,
    data: {
      status?: WorkspaceJobStatus;
      isSaved?: boolean;
      isDismissed?: boolean;
      notes?: string | null;
      appliedAt?: Date | null;
    },
  ): Promise<WorkspaceJobState> {
    const updateData: {
      status?: string;
      isSaved?: boolean;
      isDismissed?: boolean;
      notes?: string | null;
      appliedAt?: Date | null;
    } = {};

    if (data.status !== undefined) updateData.status = data.status;
    if (data.isSaved !== undefined) updateData.isSaved = data.isSaved;
    if (data.isDismissed !== undefined)
      updateData.isDismissed = data.isDismissed;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.appliedAt !== undefined) updateData.appliedAt = data.appliedAt;

    const row = await this.prisma.client.workspaceJobState.upsert({
      where: {
        organizationId_jobId: {
          organizationId: workspaceId,
          jobId,
        },
      },
      update: updateData,
      create: {
        organizationId: workspaceId,
        jobId,
        status: data.status ?? 'discovered',
        isSaved: data.isSaved ?? false,
        isDismissed: data.isDismissed ?? false,
        notes: data.notes ?? null,
        appliedAt: data.appliedAt ?? null,
      },
    });

    return this.mapWorkspaceJobState(row);
  }

  /** Retrieve workspace-scoped state for a set of jobIds in one query. */
  async findWorkspaceStatesForJobs(
    workspaceId: string,
    jobIds: string[],
  ): Promise<
    Map<
      string,
      {
        status: string;
        isSaved: boolean;
        isDismissed: boolean;
        notes: string | null;
        appliedAt: Date | null;
      }
    >
  > {
    const rows = await this.prisma.client.workspaceJobState.findMany({
      where: { organizationId: workspaceId, jobId: { in: jobIds } },
      select: {
        jobId: true,
        status: true,
        isSaved: true,
        isDismissed: true,
        notes: true,
        appliedAt: true,
      },
    });

    return new Map(rows.map((r) => [r.jobId, r]));
  }

  // ── Mappers ────────────────────────────────────────────────────────────

  private mapJob(row: Job): CanonicalJob {
    return {
      id: row.id,
      externalId: row.externalId ?? undefined,
      fingerprint: row.fingerprint ?? undefined,
      source: row.source,
      sourceUrl: row.sourceUrl ?? undefined,
      company: row.company,
      title: row.title,
      location: row.location,
      isRemote: row.isRemote,
      remotePolicy:
        (row.remotePolicy as CanonicalJob['remotePolicy']) ?? undefined,
      employmentType: row.employmentType ?? undefined,
      salaryMin: row.salaryMin ?? undefined,
      salaryMax: row.salaryMax ?? undefined,
      salaryCurrency: row.salaryCurrency ?? undefined,
      salaryRange: row.salaryRange ?? undefined,
      description: row.description ?? undefined,
      requiredSkills: row.requiredSkills,
      preferredSkills: row.preferredSkills,
      postedAt: row.postedAt?.toISOString() ?? undefined,
      expiresAt: row.expiresAt?.toISOString() ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapMatch(row: JobMatch): StoredJobMatch {
    return {
      id: row.id,
      jobId: row.jobId,
      workspaceId: row.organizationId,
      resumeProfileId: row.resumeProfileId ?? undefined,
      overallScore: row.overallScore,
      skillScore: row.skillScore,
      roleScore: row.roleScore,
      experienceScore: row.experienceScore,
      locationScore: row.locationScore,
      seniorityScore: row.seniorityScore,
      matchedSkills: row.matchedSkills,
      missingSkills: row.missingSkills,
      confidence: row.confidence,
      explanation: row.explanation,
      evidence: row.evidence as JobMatchEvidence | null,
      profileVersion: row.profileVersion ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapWorkspaceJobState(
    row: PrismaWorkspaceJobState,
  ): WorkspaceJobState {
    return {
      id: row.id,
      workspaceId: row.organizationId,
      jobId: row.jobId,
      status: row.status as WorkspaceJobStatus,
      isSaved: row.isSaved,
      isDismissed: row.isDismissed,
      notes: row.notes ?? undefined,
      appliedAt: row.appliedAt?.toISOString() ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
