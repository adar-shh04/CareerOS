import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import type { Application, Job, Prisma } from '../generated/prisma/client';
import type {
  ApplicationJobSummary,
  ApplicationRecord,
  ApplicationStatus,
  ApplicationStatusHistoryRecord,
  CreateApplicationInput,
  MarkAppliedInput,
  UpdateApplicationInput,
} from './applications.types';
import { APPLICATION_STATUSES } from './applications.types';

type ApplicationWithJob = Application & {
  job?: Job | null;
};

type Tx = Prisma.TransactionClient;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Pipeline stages that can only be reached after the user has applied. */
const POST_APPLY_STATUSES: readonly ApplicationStatus[] = [
  'applied',
  'screening',
  'interview',
  'offer',
  'rejected',
];

/**
 * Application is the canonical record of a user's application to a job.
 *
 * WorkspaceJobState mirrors it so the Job Radar and the Applications CRM agree:
 * - application in an applied stage  → job state status "applied", same appliedAt
 * - application "saved"              → job state saved (status "saved", isSaved)
 * - application deleted              → an "applied" job state reverts to
 *                                      "saved"/"discovered"
 * Every mutation below updates both records in one transaction.
 */
@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Query ──────────────────────────────────────────────────────────────

  async listByWorkspace(workspaceId: string): Promise<ApplicationRecord[]> {
    const rows = await this.prisma.client.application.findMany({
      where: { organizationId: workspaceId },
      include: { job: true },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((r: ApplicationWithJob) => this.map(r));
  }

  async findById(
    workspaceId: string,
    applicationId: string,
  ): Promise<ApplicationRecord | null> {
    if (!uuidPattern.test(applicationId)) return null;
    const row = await this.prisma.client.application.findFirst({
      where: { id: applicationId, organizationId: workspaceId },
      include: { job: true },
    });
    return row ? this.map(row) : null;
  }

  /** True when the workspace has applied to the job (per the Application). */
  async hasAppliedToJob(workspaceId: string, jobId: string): Promise<boolean> {
    const row = await this.prisma.client.application.findFirst({
      where: { organizationId: workspaceId, jobId },
      select: { status: true, appliedAt: true },
    });
    return row ? this.isAppliedStage(row.status, row.appliedAt) : false;
  }

  async getStatusHistory(
    workspaceId: string,
    applicationId: string,
  ): Promise<ApplicationStatusHistoryRecord[]> {
    const app = await this.findById(workspaceId, applicationId);
    if (!app)
      throw new NotFoundException(`Application ${applicationId} not found.`);

    const rows = await this.prisma.client.applicationStatusHistory.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => ({
      id: r.id,
      applicationId: r.applicationId,
      status: r.status as ApplicationStatus,
      notes: r.notes,
      createdAt: r.createdAt,
    }));
  }

  // ── Mutations ─────────────────────────────────────────────────────────

  async create(
    workspaceId: string,
    input: CreateApplicationInput,
  ): Promise<ApplicationRecord> {
    const status = input.status ?? 'saved';
    this.assertValidStatus(status);
    await this.assertJobExists(input.jobId);
    await this.assertResumeReferences(workspaceId, input);

    const existing = await this.prisma.client.application.findFirst({
      where: { organizationId: workspaceId, jobId: input.jobId },
    });

    if (existing) {
      throw new BadRequestException(
        `An application for job ${input.jobId} already exists in this workspace.`,
      );
    }

    const row = await this.prisma.client.$transaction(async (tx) => {
      const created = await tx.application.create({
        data: {
          organizationId: workspaceId,
          jobId: input.jobId,
          status,
          notes: input.notes ?? null,
          appliedAt:
            input.appliedAt ?? (status === 'applied' ? new Date() : null),
          resumeProfileId: input.resumeProfileId ?? null,
          resumeVersionId: input.resumeVersionId ?? null,
        },
        include: { job: true },
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: created.id,
          status,
          notes: `Application created with status "${status}".`,
        },
      });

      await this.syncWorkspaceJobState(tx, workspaceId, created);
      return created;
    });

    return this.map(row);
  }

  async update(
    workspaceId: string,
    applicationId: string,
    input: UpdateApplicationInput,
  ): Promise<ApplicationRecord> {
    const existing = await this.findById(workspaceId, applicationId);
    if (!existing) {
      throw new NotFoundException(`Application ${applicationId} not found.`);
    }

    if (input.status) {
      this.assertValidStatus(input.status);
    }
    await this.assertResumeReferences(
      workspaceId,
      {
        resumeProfileId: input.resumeProfileId,
        resumeVersionId: input.resumeVersionId,
      },
      input.resumeProfileId ?? existing.resumeProfileId,
    );

    // Moving to "applied" records when it happened unless the caller set it.
    const appliedAt =
      input.appliedAt !== undefined
        ? input.appliedAt
        : input.status === 'applied' && !existing.appliedAt
          ? new Date()
          : undefined;

    const row = await this.prisma.client.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id: applicationId },
        data: {
          ...(input.status ? { status: input.status } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          ...(appliedAt !== undefined ? { appliedAt } : {}),
          ...(input.resumeProfileId !== undefined
            ? { resumeProfileId: input.resumeProfileId }
            : {}),
          ...(input.resumeVersionId !== undefined
            ? { resumeVersionId: input.resumeVersionId }
            : {}),
        },
        include: { job: true },
      });

      if (input.status && input.status !== existing.status) {
        await tx.applicationStatusHistory.create({
          data: {
            applicationId,
            status: input.status,
            notes: input.notes ?? null,
          },
        });
      }

      await this.syncWorkspaceJobState(tx, workspaceId, updated);
      return updated;
    });

    return this.map(row);
  }

  /**
   * Record that the workspace applied to a job, creating the Application if
   * needed. An application already past "applied" keeps its stage; a supplied
   * resume profile is always recorded.
   */
  async markApplied(
    workspaceId: string,
    jobId: string,
    input: MarkAppliedInput = {},
  ): Promise<ApplicationRecord> {
    await this.assertJobExists(jobId);
    await this.assertResumeReferences(workspaceId, {
      resumeProfileId: input.resumeProfileId,
    });

    const row = await this.prisma.client.$transaction(async (tx) => {
      const existing = await tx.application.findFirst({
        where: { organizationId: workspaceId, jobId },
      });

      if (!existing) {
        const created = await tx.application.create({
          data: {
            organizationId: workspaceId,
            jobId,
            status: 'applied',
            notes: input.notes ?? null,
            appliedAt: input.appliedAt ?? new Date(),
            resumeProfileId: input.resumeProfileId ?? null,
          },
          include: { job: true },
        });
        await tx.applicationStatusHistory.create({
          data: {
            applicationId: created.id,
            status: 'applied',
            notes: input.notes ?? 'Marked as applied.',
          },
        });
        await this.syncWorkspaceJobState(tx, workspaceId, created);
        return created;
      }

      const advancing = !this.isAppliedStage(
        existing.status,
        existing.appliedAt,
      );
      const updated = await tx.application.update({
        where: { id: existing.id },
        data: {
          ...(advancing ? { status: 'applied' } : {}),
          ...(input.appliedAt
            ? { appliedAt: input.appliedAt }
            : existing.appliedAt
              ? {}
              : { appliedAt: new Date() }),
          ...(input.resumeProfileId
            ? { resumeProfileId: input.resumeProfileId }
            : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
        },
        include: { job: true },
      });

      if (advancing) {
        await tx.applicationStatusHistory.create({
          data: {
            applicationId: existing.id,
            status: 'applied',
            notes: input.notes ?? 'Marked as applied.',
          },
        });
      }

      await this.syncWorkspaceJobState(tx, workspaceId, updated);
      return updated;
    });

    return this.map(row);
  }

  async delete(workspaceId: string, applicationId: string): Promise<void> {
    const existing = await this.findById(workspaceId, applicationId);
    if (!existing) {
      throw new NotFoundException(`Application ${applicationId} not found.`);
    }

    await this.prisma.client.$transaction(async (tx) => {
      await tx.application.delete({ where: { id: applicationId } });
      await this.syncWorkspaceJobState(tx, workspaceId, {
        jobId: existing.jobId,
        status: null,
        appliedAt: null,
      });
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private isAppliedStage(status: string, appliedAt: Date | null): boolean {
    return (
      POST_APPLY_STATUSES.includes(status as ApplicationStatus) ||
      (status === 'withdrawn' && appliedAt !== null)
    );
  }

  /** Mirror an Application (or its deletion, status=null) onto WorkspaceJobState. */
  private async syncWorkspaceJobState(
    tx: Tx,
    workspaceId: string,
    app: { jobId: string; status: string | null; appliedAt: Date | null },
  ): Promise<void> {
    const where = {
      organizationId_jobId: { organizationId: workspaceId, jobId: app.jobId },
    };

    if (app.status === null) {
      const state = await tx.workspaceJobState.findUnique({ where });
      if (state?.status === 'applied') {
        await tx.workspaceJobState.update({
          where,
          data: {
            status: state.isSaved ? 'saved' : 'discovered',
            appliedAt: null,
          },
        });
      }
      return;
    }

    if (this.isAppliedStage(app.status, app.appliedAt)) {
      await tx.workspaceJobState.upsert({
        where,
        update: { status: 'applied', appliedAt: app.appliedAt },
        create: {
          organizationId: workspaceId,
          jobId: app.jobId,
          status: 'applied',
          appliedAt: app.appliedAt,
        },
      });
      return;
    }

    if (app.status === 'saved') {
      await tx.workspaceJobState.upsert({
        where,
        update: { status: 'saved', isSaved: true, appliedAt: app.appliedAt },
        create: {
          organizationId: workspaceId,
          jobId: app.jobId,
          status: 'saved',
          isSaved: true,
          appliedAt: app.appliedAt,
        },
      });
    }
    // "withdrawn" before ever applying leaves the job state unchanged.
  }

  private async assertJobExists(jobId: string): Promise<void> {
    const job = uuidPattern.test(jobId)
      ? await this.prisma.client.job.findUnique({
          where: { id: jobId },
          select: { id: true },
        })
      : null;
    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found.`);
    }
  }

  /**
   * Caller-supplied resume references must belong to this workspace, and a
   * supplied version must belong to the application's resume profile.
   */
  private async assertResumeReferences(
    workspaceId: string,
    refs: { resumeProfileId?: string | null; resumeVersionId?: string | null },
    versionProfileScope: string | null | undefined = refs.resumeProfileId,
  ): Promise<void> {
    if (refs.resumeProfileId) {
      const profile = uuidPattern.test(refs.resumeProfileId)
        ? await this.prisma.client.resumeProfile.findFirst({
            where: { id: refs.resumeProfileId, organizationId: workspaceId },
            select: { id: true },
          })
        : null;
      if (!profile) {
        throw new NotFoundException('Resume profile not found.');
      }
    }

    if (refs.resumeVersionId) {
      const version = uuidPattern.test(refs.resumeVersionId)
        ? await this.prisma.client.resumeVersion.findFirst({
            where: {
              id: refs.resumeVersionId,
              organizationId: workspaceId,
              ...(versionProfileScope
                ? { resumeProfileId: versionProfileScope }
                : {}),
            },
            select: { id: true },
          })
        : null;
      if (!version) {
        throw new NotFoundException('Resume version not found.');
      }
    }
  }

  private assertValidStatus(
    status: string,
  ): asserts status is ApplicationStatus {
    if (!APPLICATION_STATUSES.includes(status as ApplicationStatus)) {
      throw new BadRequestException(
        `Invalid application status "${status}". Valid values: ${APPLICATION_STATUSES.join(', ')}.`,
      );
    }
  }

  private map(row: ApplicationWithJob): ApplicationRecord {
    const job: ApplicationJobSummary | null = row.job
      ? {
          id: row.job.id,
          title: row.job.title,
          company: row.job.company,
          location: row.job.location,
          isRemote: row.job.isRemote,
          salaryRange: row.job.salaryRange,
          salaryMin: row.job.salaryMin,
          salaryMax: row.job.salaryMax,
          salaryCurrency: row.job.salaryCurrency,
          source: row.job.source,
          sourceUrl: row.job.sourceUrl,
          postedAt: row.job.postedAt,
          requiredSkills: row.job.requiredSkills,
        }
      : null;

    return {
      id: row.id,
      organizationId: row.organizationId,
      jobId: row.jobId,
      status: row.status as ApplicationStatus,
      notes: row.notes,
      appliedAt: row.appliedAt,
      resumeProfileId: row.resumeProfileId,
      resumeVersionId: row.resumeVersionId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      job,
    };
  }
}
