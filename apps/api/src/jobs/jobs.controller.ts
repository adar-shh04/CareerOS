import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { JobMatchingWeights, JobOpportunity } from '@repo/types';
import type { Response } from 'express';

import { WorkspaceMemberGuard } from '../common/guards/workspace-member.guard';
import { CreateManualJobDto } from './create-manual-job.dto';
import { ImportJobUrlDto } from './import-job-url.dto';
import type { JobUrlDraft } from './ingestion/job-url-extractors';
import { JobUrlScraperService } from './ingestion/job-url-scraper.service';
import { DEFAULT_PAGE_SIZE, JobsService, MAX_PAGE_SIZE } from './jobs.service';
import type { ListJobsQuery } from './jobs.types';

function parseNonNegativeInt(
  name: string,
  value: string | undefined,
): number | undefined {
  if (value === undefined || value === '') return undefined;
  if (!/^\d+$/.test(value)) {
    throw new BadRequestException(`${name} must be a non-negative integer.`);
  }
  return Number(value);
}

@Controller('workspaces/:workspaceId/jobs')
@UseGuards(WorkspaceMemberGuard)
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly urlScraper: JobUrlScraperService,
  ) {}

  /**
   * GET /workspaces/:workspaceId/jobs
   * Ranked Job Radar page: filters (query, remoteOnly, skill, savedOnly,
   * hideDismissed) apply to the whole catalog, fit is computed for every
   * candidate, the full set is ranked deterministically, then limit/offset
   * select the page.
   */
  @Get()
  async listJobs(
    @Param('workspaceId') workspaceId: string,
    @Query('query') query?: string,
    @Query('remoteOnly') remoteOnly?: string,
    @Query('skill') skill?: string,
    @Query('savedOnly') savedOnly?: string,
    @Query('hideDismissed') hideDismissed?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<JobOpportunity[]> {
    const listQuery: ListJobsQuery = {
      query: query?.trim() ? query.trim() : undefined,
      remoteOnly: remoteOnly === 'true',
      skill: skill?.trim() ? skill.trim() : undefined,
      savedOnly: savedOnly === 'true',
      hideDismissed: hideDismissed === 'true',
      limit: parseNonNegativeInt('limit', limit) ?? DEFAULT_PAGE_SIZE,
      offset: parseNonNegativeInt('offset', offset) ?? 0,
    };
    if (listQuery.limit === 0 || (listQuery.limit ?? 0) > MAX_PAGE_SIZE) {
      throw new BadRequestException(
        `limit must be between 1 and ${String(MAX_PAGE_SIZE)}.`,
      );
    }
    return this.jobsService.listByWorkspace(workspaceId, listQuery);
  }

  /**
   * GET /workspaces/:workspaceId/jobs/:jobId
   * Job Detail: one job enriched with this workspace's match and interaction
   * state (the same JobOpportunity contract as the list). 404 if unknown.
   */
  @Get(':jobId')
  async getJob(
    @Param('workspaceId') workspaceId: string,
    @Param('jobId') jobId: string,
  ): Promise<JobOpportunity> {
    return this.jobsService.getJobDetail(workspaceId, jobId);
  }

  /**
   * POST /workspaces/:workspaceId/jobs
   * Add a job the user pasted in. It becomes a private job of this workspace
   * (never visible to other workspaces) and is returned with its match.
   * If the workspace already has the same posting, nothing is created and the
   * existing job comes back with duplicate: true (HTTP 200 instead of 201).
   */
  @Post()
  async createManualJob(
    @Param('workspaceId') workspaceId: string,
    @Body() body: CreateManualJobDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ job: JobOpportunity; duplicate: boolean }> {
    const result = await this.jobsService.addManualJob(workspaceId, body);
    // 201 when a job was created, 200 when the posting already existed.
    res.status(result.duplicate ? HttpStatus.OK : HttpStatus.CREATED);
    return result;
  }

  /**
   * POST /workspaces/:workspaceId/jobs/import-url
   * Read a public job posting (Greenhouse, Lever, or any page with schema.org
   * JobPosting data) and return DRAFT form fields. Saves nothing: the client
   * reviews the draft and submits it through POST /jobs. 400 for unsafe URLs,
   * 422 when the page cannot be read (paste the description instead).
   */
  @Post('import-url')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async importJobFromUrl(
    @Param('workspaceId') _workspaceId: string,
    @Body() body: ImportJobUrlDto,
  ): Promise<JobUrlDraft> {
    return this.urlScraper.importFromUrl(body.url);
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
   * Update Job Radar flags (isSaved, isDismissed) and notes. The stored status
   * is derived; a legacy `status` is mapped onto the flags.
   * Setting status "applied" (optionally with appliedAt) goes through the Application CRM.
   */
  @Patch(':jobId/state')
  async updateJobState(
    @Param('workspaceId') workspaceId: string,
    @Param('jobId') jobId: string,
    @Body()
    body?: {
      status?: string;
      isSaved?: boolean;
      isDismissed?: boolean;
      notes?: string;
      appliedAt?: string;
    },
  ): Promise<JobOpportunity> {
    return this.jobsService.updateJobState(workspaceId, jobId, body ?? {});
  }

  /**
   * POST /workspaces/:workspaceId/jobs/:jobId/apply
   * Mark a job as applied using a selected ResumeProfile (no ResumeVersion snapshot required).
   * Creates or advances the workspace's Application for the job (recording
   * resumeProfileId, which must belong to this workspace) and syncs job state.
   */
  @Post(':jobId/apply')
  @HttpCode(HttpStatus.OK)
  async applyJob(
    @Param('workspaceId') workspaceId: string,
    @Param('jobId') jobId: string,
    @Body() body?: { resumeProfileId?: string; notes?: string },
  ): Promise<JobOpportunity> {
    return this.jobsService.applyToJob(workspaceId, jobId, body);
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
