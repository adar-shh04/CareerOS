import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type {
  JobMatchingWeights,
  JobOpportunity,
  WorkspaceJobStatus,
} from '@repo/types';

import { WorkspaceMemberGuard } from '../common/guards/workspace-member.guard';
import { JobsService } from './jobs.service';
import type { CanonicalJob, ListJobsQuery } from './jobs.types';

@Controller('workspaces/:workspaceId/jobs')
@UseGuards(WorkspaceMemberGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  /**
   * GET /workspaces/:workspaceId/jobs
   * List canonical jobs with auto-computed match results (ranked by match score desc)
   * and workspace interaction state merged in.
   */
  @Get()
  async listJobs(
    @Param('workspaceId') workspaceId: string,
    @Query('query') query?: string,
    @Query('remoteOnly') remoteOnly?: string,
    @Query('skill') skill?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<JobOpportunity[]> {
    const listQuery: ListJobsQuery = {
      query: query?.trim() ? query.trim() : undefined,
      remoteOnly: remoteOnly === 'true',
      skill: skill?.trim() ? skill.trim() : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    };
    return this.jobsService.listByWorkspace(workspaceId, listQuery);
  }

  /**
   * GET /workspaces/:workspaceId/jobs/:jobId
   * Retrieve a single canonical job by ID.
   */
  @Get(':jobId')
  async getJob(
    @Param('workspaceId') _workspaceId: string,
    @Param('jobId') jobId: string,
  ): Promise<CanonicalJob> {
    const job = await this.jobsService.findJobById(jobId);
    if (!job) throw new NotFoundException(`Job ${jobId} not found.`);
    return job;
  }

  /**
   * POST /workspaces/:workspaceId/jobs/ingest
   * Trigger real job ingestion from an external source adapter (e.g. Apify/LinkedIn).
   * Normalizes, deduplicates, stores canonical jobs, and returns ingestion stats + enriched jobs.
   */
  @Post('ingest')
  @HttpCode(HttpStatus.OK)
  async ingestJobs(
    @Param('workspaceId') workspaceId: string,
    @Body()
    body?: {
      query?: string;
      location?: string;
      limit?: number;
      source?: string;
    },
  ) {
    return this.jobsService.ingestJobs(workspaceId, {
      query: body?.query,
      location: body?.location,
      limit: body?.limit,
      source: body?.source,
    });
  }

  /**
   * POST /workspaces/:workspaceId/jobs/:jobId/match
   * Explicitly run the deterministic matching engine for one job × workspace.
   * Accepts an optional resumeProfileId and weight overrides in the body.
   * Persists the result and returns the enriched JobOpportunity.
   */
  @Post(':jobId/match')
  @HttpCode(HttpStatus.OK)
  async matchJob(
    @Param('workspaceId') workspaceId: string,
    @Param('jobId') jobId: string,
    @Body()
    body?: {
      resumeProfileId?: string;
      weights?: Partial<JobMatchingWeights>;
    },
  ): Promise<JobOpportunity> {
    return this.jobsService.computeAndPersistMatch(
      jobId,
      workspaceId,
      body?.resumeProfileId,
      body?.weights,
    );
  }

  /**
   * POST /workspaces/:workspaceId/jobs/:jobId/save
   * Save a job for this workspace.
   */
  @Post(':jobId/save')
  @HttpCode(HttpStatus.OK)
  async saveJob(
    @Param('workspaceId') workspaceId: string,
    @Param('jobId') jobId: string,
  ): Promise<JobOpportunity> {
    return this.jobsService.saveJob(workspaceId, jobId);
  }

  /**
   * POST /workspaces/:workspaceId/jobs/:jobId/dismiss
   * Dismiss a job for this workspace.
   */
  @Post(':jobId/dismiss')
  @HttpCode(HttpStatus.OK)
  async dismissJob(
    @Param('workspaceId') workspaceId: string,
    @Param('jobId') jobId: string,
  ): Promise<JobOpportunity> {
    return this.jobsService.dismissJob(workspaceId, jobId);
  }

  /**
   * POST /workspaces/:workspaceId/jobs/:jobId/restore
   * Restore a previously dismissed job for this workspace.
   */
  @Post(':jobId/restore')
  @HttpCode(HttpStatus.OK)
  async restoreJob(
    @Param('workspaceId') workspaceId: string,
    @Param('jobId') jobId: string,
  ): Promise<JobOpportunity> {
    return this.jobsService.restoreJob(workspaceId, jobId);
  }

  /**
   * PATCH /workspaces/:workspaceId/jobs/:jobId/state
   * Update interaction state (status, notes, appliedAt) for a job in this workspace.
   */
  @Patch(':jobId/state')
  async updateJobState(
    @Param('workspaceId') workspaceId: string,
    @Param('jobId') jobId: string,
    @Body()
    body?: {
      status?: WorkspaceJobStatus;
      notes?: string;
      appliedAt?: string;
    },
  ): Promise<JobOpportunity> {
    return this.jobsService.updateJobState(workspaceId, jobId, body ?? {});
  }

  /**
   * GET /workspaces/:workspaceId/jobs/:jobId/analysis
   * Perform structured job analysis with skill gaps and targeting evidence.
   */
  @Get(':jobId/analysis')
  async getJobAnalysis(
    @Param('workspaceId') workspaceId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.jobsService.analyzeJob(jobId, workspaceId);
  }

  /**
   * POST /workspaces/:workspaceId/jobs/:jobId/targeted-resume
   * Create an immutable targeted ResumeVersion backed by structured job analysis
   * and grounded priority selections from MasterCareerProfile.
   */
  @Post(':jobId/targeted-resume')
  @HttpCode(HttpStatus.OK)
  async createTargetedResume(
    @Param('workspaceId') workspaceId: string,
    @Param('jobId') jobId: string,
    @Body() body?: { resumeProfileId?: string },
  ) {
    return this.jobsService.createTargetedResumeVersion(
      jobId,
      workspaceId,
      body?.resumeProfileId,
    );
  }
}
