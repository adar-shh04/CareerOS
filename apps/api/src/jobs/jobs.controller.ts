import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { JobMatchingWeights, JobOpportunity } from '@repo/types';

import { WorkspaceMemberGuard } from '../common/guards/workspace-member.guard';
import { JobsService } from './jobs.service';
import type { CanonicalJob, ListJobsQuery } from './jobs.types';

@Controller('workspaces/:workspaceId/jobs')
@UseGuards(WorkspaceMemberGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  /**
   * GET /workspaces/:workspaceId/jobs
   * List canonical jobs with stored match results and workspace state merged in.
   * Matching is NOT triggered here — call POST .../jobs/:jobId/match to run it.
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
   * Retrieve a single canonical job by ID (no match data — use the match endpoint).
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
