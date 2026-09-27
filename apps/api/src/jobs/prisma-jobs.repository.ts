import { Injectable } from '@nestjs/common';
import type {
  CanonicalJob,
  JobMatchEvidence,
  WorkspaceJobState,
  WorkspaceJobStatus,
} from '@repo/types';

import { PrismaService } from '../database/prisma.service';
import {
  type Job,
  type JobMatch,
  Prisma,
  type WorkspaceJobState as PrismaWorkspaceJobState,
} from '../generated/prisma/client';
import type {
  CreateJobInput,
  GenericMatchSourceRow,
  JobRankingKey,
  ListJobsQuery,
  MatchOutput,
  StoredJobMatch,
} from './jobs.types';
import type { MatchSource } from './match-freshness';
import {
  buildNormalizedMetadata,
  parseNormalizedMetadata,
} from './normalized-metadata';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Prisma-backed repository for canonical jobs, workspace job states, and job matches. */
@Injectable()
export class PrismaJobsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Canonical Jobs ─────────────────────────────────────────────────────

  /**
   * Upsert a canonical job by (source, externalId) or by fingerprint.
   * If externalId is absent but fingerprint is present, deduplicates by fingerprint.
   * Race-safe against concurrent ingestion runs.
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
      // Normalized data is written only by the normalization pipeline; other
      // writers leave the stored value untouched.
      ...(input.normalized
        ? {
            normalizedMetadata: buildNormalizedMetadata(
              input,
            ) as unknown as Prisma.InputJsonValue,
          }
        : {}),
    };

    // If neither externalId nor fingerprint is provided, create directly
    if (!input.externalId && !input.fingerprint) {
      const row = await this.prisma.client.job.create({ data });
      return this.mapJob(row);
    }

    const findExisting = async (): Promise<Job | null> => {
      if (input.externalId) {
        const byExternalId = await this.prisma.client.job.findUnique({
          where: {
            source_externalId: {
              source: data.source,
              externalId: input.externalId,
            },
          },
        });
        if (byExternalId) return byExternalId;
      }
      if (input.fingerprint) {
        const byFingerprint = await this.prisma.client.job.findUnique({
          where: { fingerprint: input.fingerprint },
        });
        if (byFingerprint) return byFingerprint;
      }
      return null;
    };

    const existing = await findExisting();
    if (existing) {
      const row = await this.prisma.client.job.update({
        where: { id: existing.id },
        data: {
          ...data,
          ...(input.externalId ? { externalId: input.externalId } : {}),
        },
      });
      return this.mapJob(row);
    }

    try {
      const row = await this.prisma.client.job.create({
        data: {
          ...data,
          ...(input.externalId ? { externalId: input.externalId } : {}),
        },
      });
      return this.mapJob(row);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const retryExisting = await findExisting();
        if (retryExisting) {
          const row = await this.prisma.client.job.update({
            where: { id: retryExisting.id },
            data: {
              ...data,
              ...(input.externalId ? { externalId: input.externalId } : {}),
            },
          });
          return this.mapJob(row);
        }
      }
      throw error;
    }
  }

  /**
   * All jobs matching the filters, as lightweight ranking keys. Every filter
   * is applied in the database against the whole catalog (never against a
   * loaded page). Filters are AND-ed; each multi-field filter is its own OR.
   */
  async listCandidateJobs(
    workspaceId: string,
    query: ListJobsQuery = {},
  ): Promise<JobRankingKey[]> {
    const { query: q, remoteOnly, skill, savedOnly, hideDismissed } = query;
    const and: Prisma.JobWhereInput[] = [];

    if (remoteOnly) and.push({ isRemote: true });
    if (skill) {
      and.push({
        OR: [
          { requiredSkills: { has: skill } },
          { preferredSkills: { has: skill } },
        ],
      });
    }
    if (q) {
      and.push({
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { company: { contains: q, mode: 'insensitive' } },
          { location: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      });
    }
    // Workspace-scoped Job Radar state filters.
    if (savedOnly) {
      and.push({
        workspaceStates: {
          some: { organizationId: workspaceId, isSaved: true },
        },
      });
    }
    if (hideDismissed) {
      and.push({
        workspaceStates: {
          none: { organizationId: workspaceId, isDismissed: true },
        },
      });
    }

    return this.prisma.client.job.findMany({
      where: and.length > 0 ? { AND: and } : {},
      select: { id: true, postedAt: true, createdAt: true, updatedAt: true },
    });
  }

  /** Full canonical jobs for the given ids (order not guaranteed). */
  async findJobsByIds(ids: string[]): Promise<CanonicalJob[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.client.job.findMany({
      where: { id: { in: ids } },
    });
    return rows.map((r) => this.mapJob(r));
  }

  async findJobById(id: string): Promise<CanonicalJob | null> {
    // Job ids are UUID columns; anything else cannot exist (and would make
    // PostgreSQL raise instead of returning "not found").
    if (!uuidPattern.test(id)) return null;
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
   *
   * Uniqueness is enforced by two PARTIAL unique indexes (resume_profile_id IS
   * NULL / IS NOT NULL). PostgreSQL cannot use a partial index as the arbiter
   * of Prisma's `upsert` (ON CONFLICT), so both paths find → update/create and
   * resolve a concurrent insert (P2002) by updating the winner's row.
   */
  async upsertJobMatch(
    jobId: string,
    workspaceId: string,
    output: MatchOutput,
    source: MatchSource & { resumeProfileId?: string },
  ): Promise<StoredJobMatch> {
    const data = this.matchData(output, source);

    const key = {
      organizationId: workspaceId,
      jobId,
      resumeProfileId: source.resumeProfileId ?? null,
    };

    const updateExisting = async (): Promise<StoredJobMatch | null> => {
      const existing = await this.prisma.client.jobMatch.findFirst({
        where: key,
      });
      if (!existing) return null;
      const row = await this.prisma.client.jobMatch.update({
        where: { id: existing.id },
        data,
      });
      return this.mapMatch(row);
    };

    const updated = await updateExisting();
    if (updated) return updated;

    try {
      const row = await this.prisma.client.jobMatch.create({
        data: { ...key, ...data },
      });
      return this.mapMatch(row);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const raced = await updateExisting();
        if (raced) return raced;
      }
      throw error;
    }
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

  /**
   * Score + source inputs of every Master-Profile (generic) match in the
   * workspace — enough to rank and to decide freshness without loading
   * evidence. Scoped to the workspace; no id list, so no parameter limits.
   */
  async listGenericMatchSources(
    workspaceId: string,
  ): Promise<GenericMatchSourceRow[]> {
    return this.prisma.client.jobMatch.findMany({
      where: { organizationId: workspaceId, resumeProfileId: null },
      select: {
        jobId: true,
        overallScore: true,
        matcherVersion: true,
        profileVersion: true,
        jobUpdatedAt: true,
        resumeProfileUpdatedAt: true,
        weightsKey: true,
      },
    });
  }

  /** Full generic matches for a set of jobs in one workspace. */
  async findGenericMatchesForJobs(
    workspaceId: string,
    jobIds: string[],
  ): Promise<Map<string, StoredJobMatch>> {
    if (jobIds.length === 0) return new Map();
    const rows = await this.prisma.client.jobMatch.findMany({
      where: {
        organizationId: workspaceId,
        resumeProfileId: null,
        jobId: { in: jobIds },
      },
    });
    return new Map(rows.map((r) => [r.jobId, this.mapMatch(r)]));
  }

  /**
   * Replace the generic matches for a batch of jobs in one transaction.
   * ON CONFLICT DO NOTHING (skipDuplicates) makes concurrent recomputation of
   * the same jobs safe with the partial unique index; both writers compute
   * identical results from identical inputs.
   */
  async replaceGenericMatches(
    workspaceId: string,
    entries: { jobId: string; output: MatchOutput; source: MatchSource }[],
  ): Promise<void> {
    if (entries.length === 0) return;
    await this.prisma.client.$transaction([
      this.prisma.client.jobMatch.deleteMany({
        where: {
          organizationId: workspaceId,
          resumeProfileId: null,
          jobId: { in: entries.map((e) => e.jobId) },
        },
      }),
      this.prisma.client.jobMatch.createMany({
        data: entries.map((e) => ({
          jobId: e.jobId,
          organizationId: workspaceId,
          resumeProfileId: null,
          ...this.matchData(e.output, e.source),
        })),
        skipDuplicates: true,
      }),
    ]);
  }

  private matchData(output: MatchOutput, source: MatchSource) {
    return {
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
      profileVersion: source.profileVersion,
      matcherVersion: source.matcherVersion,
      jobUpdatedAt: source.jobUpdatedAt,
      resumeProfileUpdatedAt: source.resumeProfileUpdatedAt,
      weightsKey: source.weightsKey,
    };
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
    const normalized = parseNormalizedMetadata(row.normalizedMetadata);
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
      seniority: normalized?.seniority ?? undefined,
      experienceRequirements: normalized?.experienceRequirements ?? undefined,
      isNormalized: normalized !== null,
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
      matcherVersion: row.matcherVersion,
      jobUpdatedAt: row.jobUpdatedAt,
      resumeProfileUpdatedAt: row.resumeProfileUpdatedAt,
      weightsKey: row.weightsKey,
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
