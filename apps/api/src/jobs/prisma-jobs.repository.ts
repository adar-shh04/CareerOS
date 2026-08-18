import { Injectable } from '@nestjs/common';
import type { CanonicalJob, JobMatchEvidence } from '@repo/types';

import { PrismaService } from '../database/prisma.service';
import type { Job, JobMatch, Prisma } from '../generated/prisma/client';
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
   * Upsert a canonical job by (source, externalId). If externalId is absent
   * the record is always inserted (manual/one-off jobs).
   */
  async upsertCanonicalJob(input: CreateJobInput): Promise<CanonicalJob> {
    const data = {
      source: input.source ?? 'manual',
      sourceUrl: input.sourceUrl ?? null,
      company: input.company,
      title: input.title,
      location: input.location,
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
    _fingerprint?: string,
  ): Promise<CanonicalJob | null> {
    if (externalId) {
      const existing = await this.prisma.client.job.findUnique({
        where: {
          source_externalId: { source, externalId },
        },
      });
      if (existing) return this.mapJob(existing);
    }

    return null;
  }

  // ── Job Matches ────────────────────────────────────────────────────────

  /**
   * Upsert a persisted job match. The unique key is
   * (workspaceId, jobId, resumeProfileId). When resumeProfileId is null/empty the
   * match is profile-agnostic (raw MasterCareerProfile).
   */
  async upsertJobMatch(
    jobId: string,
    workspaceId: string,
    output: MatchOutput,
    resumeProfileId?: string,
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
    };

    const targetResumeProfileId = resumeProfileId ?? '';

    const row = await this.prisma.client.jobMatch.upsert({
      where: {
        organizationId_jobId_resumeProfileId: {
          organizationId: workspaceId,
          jobId,
          resumeProfileId: targetResumeProfileId,
        },
      },
      update: data,
      create: {
        jobId,
        organizationId: workspaceId,
        resumeProfileId: resumeProfileId ?? null,
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
    const targetResumeProfileId = resumeProfileId ?? '';
    const row = await this.prisma.client.jobMatch.findUnique({
      where: {
        organizationId_jobId_resumeProfileId: {
          organizationId: workspaceId,
          jobId,
          resumeProfileId: targetResumeProfileId,
        },
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
        ...(resumeProfileId !== undefined ? { resumeProfileId } : {}),
      },
      orderBy: { overallScore: 'desc' },
    });
    return rows.map((r) => this.mapMatch(r));
  }

  // ── Workspace Job State ────────────────────────────────────────────────

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
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
