import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { WorkspaceMemberGuard } from '../common/guards/workspace-member.guard';
import { ApplicationsService } from './applications.service';
import type { ApplicationStatus } from './applications.types';

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
      resumeProfileId?: string;
      resumeVersionId?: string;
    },
  ) {
    return this.applicationsService.create(workspaceId, {
      ...body,
      appliedAt: body.appliedAt ? new Date(body.appliedAt) : undefined,
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
      return { message: `Application ${applicationId} not found.` };
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
      appliedAt?: string;
      resumeProfileId?: string;
      resumeVersionId?: string;
    },
  ) {
    return this.applicationsService.update(workspaceId, applicationId, {
      ...body,
      appliedAt: body.appliedAt ? new Date(body.appliedAt) : undefined,
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
