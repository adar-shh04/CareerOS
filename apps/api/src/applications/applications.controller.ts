import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { WorkspaceMemberGuard } from '../common/guards/workspace-member.guard';
import { parseDateField } from './application-dates';
import { ApplicationsService } from './applications.service';
import type { ApplicationStatus } from './applications.types';

/** undefined = unchanged, null = clear, otherwise a valid ISO date. */
function parseAppliedAt(
  value: string | null | undefined,
): Date | null | undefined {
  return parseDateField('appliedAt', value);
}

/** Follow-up / deadline: calendar days, stored as UTC midnight. */
function parseDay(
  field: 'followUpAt' | 'deadlineAt',
  value: string | null | undefined,
): Date | null | undefined {
  return parseDateField(field, value, { dateOnly: true });
}

@Controller('workspaces/:workspaceId/applications')
@UseGuards(WorkspaceMemberGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  /**
   * GET /workspaces/:workspaceId/applications
   * List all applications for the workspace, newest first.
   */
  @Get()
  async list(@Param('workspaceId') workspaceId: string) {
    return this.applicationsService.listByWorkspace(workspaceId);
  }

  /**
   * POST /workspaces/:workspaceId/applications
   * Create a new application record for a job.
   */
  @Post()
  async create(
    @Param('workspaceId') workspaceId: string,
    @Body()
    body: {
      jobId: string;
      status?: ApplicationStatus;
      notes?: string;
      appliedAt?: string;
      followUpAt?: string | null;
      deadlineAt?: string | null;
      resumeProfileId?: string;
      resumeVersionId?: string;
    },
  ) {
    return this.applicationsService.create(workspaceId, {
      ...body,
      appliedAt: parseAppliedAt(body.appliedAt) ?? undefined,
      followUpAt: parseDay('followUpAt', body.followUpAt),
      deadlineAt: parseDay('deadlineAt', body.deadlineAt),
    });
  }

  /**
   * GET /workspaces/:workspaceId/applications/:applicationId
   * Retrieve a single application by ID.
   */
  @Get(':applicationId')
  async get(
    @Param('workspaceId') workspaceId: string,
    @Param('applicationId') applicationId: string,
  ) {
    const app = await this.applicationsService.findById(
      workspaceId,
      applicationId,
    );
    if (!app) {
      throw new NotFoundException(`Application ${applicationId} not found.`);
    }
    return app;
  }

  /**
   * GET /workspaces/:workspaceId/applications/:applicationId/history
   * Retrieve the full status history for an application.
   */
  @Get(':applicationId/history')
  async getHistory(
    @Param('workspaceId') workspaceId: string,
    @Param('applicationId') applicationId: string,
  ) {
    return this.applicationsService.getStatusHistory(
      workspaceId,
      applicationId,
    );
  }

  /**
   * PATCH /workspaces/:workspaceId/applications/:applicationId
   * Update status, notes, or metadata of an existing application.
   */
  @Patch(':applicationId')
  async update(
    @Param('workspaceId') workspaceId: string,
    @Param('applicationId') applicationId: string,
    @Body()
    body: {
      status?: ApplicationStatus;
      notes?: string;
      appliedAt?: string | null;
      followUpAt?: string | null;
      deadlineAt?: string | null;
      resumeProfileId?: string;
      resumeVersionId?: string;
    },
  ) {
    return this.applicationsService.update(workspaceId, applicationId, {
      ...body,
      appliedAt: parseAppliedAt(body.appliedAt),
      followUpAt: parseDay('followUpAt', body.followUpAt),
      deadlineAt: parseDay('deadlineAt', body.deadlineAt),
    });
  }

  /**
   * DELETE /workspaces/:workspaceId/applications/:applicationId
   * Remove an application tracking record.
   */
  @Delete(':applicationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('workspaceId') workspaceId: string,
    @Param('applicationId') applicationId: string,
  ) {
    await this.applicationsService.delete(workspaceId, applicationId);
  }
}
