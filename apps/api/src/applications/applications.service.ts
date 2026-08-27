import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import type { Application } from '../generated/prisma/client';
import type {
  ApplicationRecord,
  ApplicationStatus,
  ApplicationStatusHistoryRecord,
  CreateApplicationInput,
  UpdateApplicationInput,
} from './applications.types';
import { APPLICATION_STATUSES } from './applications.types';

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Query ──────────────────────────────────────────────────────────────

  async listByWorkspace(workspaceId: string): Promise<ApplicationRecord[]> {
    const rows = await this.prisma.client.application.findMany({
      where: { organizationId: workspaceId },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((r) => this.map(r));
  }

  async findById(
    workspaceId: string,
    applicationId: string,
  ): Promise<ApplicationRecord | null> {
    const row = await this.prisma.client.application.findFirst({
      where: { id: applicationId, organizationId: workspaceId },
    });
    return row ? this.map(row) : null;
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

    const existing = await this.prisma.client.application.findFirst({
      where: { organizationId: workspaceId, jobId: input.jobId },
    });

    if (existing) {
      throw new BadRequestException(
        `An application for job ${input.jobId} already exists in this workspace.`,
      );
    }

    const row = await this.prisma.client.application.create({
      data: {
        organizationId: workspaceId,
        jobId: input.jobId,
        status,
        notes: input.notes ?? null,
        appliedAt: input.appliedAt ?? null,
        resumeProfileId: input.resumeProfileId ?? null,
        resumeVersionId: input.resumeVersionId ?? null,
      },
    });

    // Capture initial status in history
    await this.prisma.client.applicationStatusHistory.create({
      data: {
        applicationId: row.id,
        status,
        notes: `Application created with status "${status}".`,
      },
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

    const row = await this.prisma.client.application.update({
      where: { id: applicationId },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.appliedAt !== undefined
          ? { appliedAt: input.appliedAt }
          : {}),
        ...(input.resumeProfileId !== undefined
          ? { resumeProfileId: input.resumeProfileId }
          : {}),
        ...(input.resumeVersionId !== undefined
          ? { resumeVersionId: input.resumeVersionId }
          : {}),
      },
    });

    // Record status transition in history
    if (input.status && input.status !== existing.status) {
      await this.prisma.client.applicationStatusHistory.create({
        data: {
          applicationId,
          status: input.status,
          notes: input.notes ?? null,
        },
      });
    }

    return this.map(row);
  }

  async delete(workspaceId: string, applicationId: string): Promise<void> {
    const existing = await this.findById(workspaceId, applicationId);
    if (!existing) {
      throw new NotFoundException(`Application ${applicationId} not found.`);
    }

    await this.prisma.client.application.delete({
      where: { id: applicationId },
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private assertValidStatus(
    status: string,
  ): asserts status is ApplicationStatus {
    if (!APPLICATION_STATUSES.includes(status as ApplicationStatus)) {
      throw new BadRequestException(
        `Invalid application status "${status}". Valid values: ${APPLICATION_STATUSES.join(', ')}.`,
      );
    }
  }

  private map(row: Application): ApplicationRecord {
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
    };
  }
}
