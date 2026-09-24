import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  CanonicalJob,
  JobAnalysisResult,
  JobMatchingWeights,
  JobOpportunity,
  WorkspaceJobStatus,
} from '@repo/types';
import { DEFAULT_MATCHING_WEIGHTS } from '@repo/types';

import { ApplicationsService } from '../applications/applications.service';
import { CareerProfileService } from '../career-profile/career-profile.service';
import {
  ResumeProfileService,
  ResumeProfileValidationError,
} from '../resume-profile/resume-profile.service';
import type { ResumeProfile } from '../resume-profile/resume-profile.types';
import { JobIngestionService } from './ingestion/job-ingestion.service';
import { JobAnalysisService } from './job-analysis.service';
import { JobMatchingService } from './job-matching.service';
import type {
  CreateJobInput,
  ListJobsQuery,
  StoredJobMatch,
} from './jobs.types';
import { PrismaJobsRepository } from './prisma-jobs.repository';
import { canonicalSkillKey } from './skill-identity';

const WORKSPACE_JOB_STATUSES: readonly WorkspaceJobStatus[] = [
  'discovered',
  'saved',
  'applied',
  'interview',
  'offer',
  'rejected',
  'dismissed',
];

/** Pipeline stages owned by the Application record, not settable via job state. */
const APPLICATION_OWNED_STATUSES: readonly WorkspaceJobStatus[] = [
  'interview',
  'offer',
  'rejected',
];

/** Workspace job state in the shape the enrichment mapper consumes. */
interface JobStateView {
  status: string;
  isSaved: boolean;
  isDismissed: boolean;
  notes?: string | null;
  appliedAt?: Date | string | null;
}

/**
 * JobsService — orchestrates DB-backed canonical jobs, workspace job states,
 * on-demand match requests, and targeted resume creation.
 */
@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly repository: PrismaJobsRepository,
    private readonly matchingService: JobMatchingService,
    private readonly jobAnalysisService: JobAnalysisService,
    private readonly careerProfileService: CareerProfileService,
    private readonly resumeProfileService: ResumeProfileService,
    private readonly ingestionService: JobIngestionService,
    private readonly applicationsService: ApplicationsService,
  ) {}

  // ── Listing ────────────────────────────────────────────────────────────

  /**
   * List jobs for a workspace, automatically ensuring match results are computed
   * and merging in stored match results and workspace interaction state.
   *
   * Results are sorted by overall match score descending, with deterministic
   * tie-breaking (postedAt desc, createdAt desc, id).
   */
  async listByWorkspace(
    workspaceId: string,
    query?: ListJobsQuery,
  ): Promise<JobOpportunity[]> {
    const jobs = await this.repository.listJobs(query);
    if (jobs.length === 0) return [];

    const jobIds = jobs.map((j) => j.id);

    // Automatically ensure jobs have fresh match results (bounded by query batch limit).
    const matchMap = await this.ensureJobMatches(
      workspaceId,
      jobs,
      query?.limit ?? 50,
    );

    // Load workspace interaction states in one query.
    const stateMap = await this.repository.findWorkspaceStatesForJobs(
      workspaceId,
      jobIds,
    );

    const opportunities = jobs.map((job) =>
      this.toEnrichedOpportunity(
        job,
        matchMap.get(job.id),
        stateMap.get(job.id),
      ),
    );

    // Sort by overall match score descending, then postedAt desc, createdAt desc, id asc
    return opportunities.sort((a, b) => {
      const scoreA = a.match?.overallScore ?? -1;
      const scoreB = b.match?.overallScore ?? -1;
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      if (a.postedAt && b.postedAt && a.postedAt !== b.postedAt) {
        return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
      }
      return a.id.localeCompare(b.id);
    });
  }

  /**
   * Job Detail: one canonical job enriched with this workspace's match and
   * interaction state — the same JobOpportunity contract the list returns.
   */
  async getJobDetail(
    workspaceId: string,
    jobId: string,
  ): Promise<JobOpportunity> {
    const job = await this.requireJob(jobId);
    await this.ensureJobMatches(workspaceId, [job], 1);
    return this.getEnrichedOpportunity(workspaceId, jobId);
  }

  // ── Auto-Matching Orchestration ────────────────────────────────────────

  /**
   * Ensure provided jobs have fresh match results for the given workspace.
   * Unmatched or stale jobs (where profileVersion !== masterProfile.version) are
   * matched against the workspace's MasterCareerProfile and persisted.
   *
   * Bounded explicitly by maxBatchSize to prevent unbounded synchronous execution.
   */
  async ensureJobMatches(
    workspaceId: string,
    jobs: CanonicalJob[],
    maxBatchSize = 50,
  ): Promise<Map<string, StoredJobMatch>> {
    const masterProfile =
      await this.careerProfileService.findByWorkspace(workspaceId);
    if (!masterProfile) {
      // User has not completed/created a profile yet; return existing stored matches or empty
      const stored =
        await this.repository.listJobMatchesForWorkspace(workspaceId);
      return new Map(stored.map((m) => [m.jobId, m]));
    }

    const storedMatches =
      await this.repository.listJobMatchesForWorkspace(workspaceId);
    const matchMap = new Map(storedMatches.map((m) => [m.jobId, m]));

    // Find jobs that need matching: either missing match or stale profileVersion
    const jobsNeedingMatch = jobs.filter((job) => {
      const existing = matchMap.get(job.id);
      if (!existing) return true;
      if (
        existing.profileVersion !== undefined &&
        existing.profileVersion !== null &&
        existing.profileVersion !== masterProfile.version
      ) {
        return true;
      }
      return false;
    });

    // Bound batch size explicitly
    const batchToProcess = jobsNeedingMatch.slice(0, maxBatchSize);

    for (const job of batchToProcess) {
      const output = this.matchingService.match({
        job,
        masterProfile,
        weights: DEFAULT_MATCHING_WEIGHTS,
      });

      const stored = await this.repository.upsertJobMatch(
        job.id,
        workspaceId,
        output,
        undefined,
        masterProfile.version,
      );

      matchMap.set(job.id, stored);
    }

    return matchMap;
  }

  // ── Matching (explicit re-computation with overrides) ──────────────────

  /**
   * Run the deterministic matching engine for one job × workspace, optionally
   * scoped to a specific ResumeProfile or with custom weight overrides.
   * Persists the result and returns the enriched JobOpportunity carrying the
   * match for exactly that (workspace, job, resumeProfile) combination.
   */
  async computeAndPersistMatch(
    jobId: string,
    workspaceId: string,
    resumeProfileId?: string,
    weights?: Partial<JobMatchingWeights>,
  ): Promise<JobOpportunity> {
    const job = await this.requireJob(jobId);

    const masterProfile =
      await this.careerProfileService.findByWorkspace(workspaceId);
    if (!masterProfile) {
      throw new NotFoundException(
        `No career profile found for workspace ${workspaceId}. Please complete your profile first.`,
      );
    }

    const resumeProfile = resumeProfileId
      ? await this.requireResumeProfile(workspaceId, resumeProfileId)
      : undefined;

    const effectiveWeights: JobMatchingWeights = {
      ...DEFAULT_MATCHING_WEIGHTS,
      ...weights,
    };

    const output = this.matchingService.match({
      job,
      masterProfile,
      resumeProfile,
      weights: effectiveWeights,
    });

    await this.repository.upsertJobMatch(
      jobId,
      workspaceId,
      output,
      resumeProfile?.id,
      masterProfile.version,
    );

    this.logger.log(
      `Matched job ${job.title} @ ${job.company} for workspace ${workspaceId}` +
        `${resumeProfile ? ` (resume profile ${resumeProfile.id})` : ''}: ` +
        `${String(Math.round(output.overallScore * 100))}/100`,
    );

    return this.getEnrichedOpportunity(workspaceId, jobId, resumeProfile?.id);
  }

  // ── Workspace Job Interactions (Save, Dismiss, Restore, Notes) ─────────
  //
  // Whether the workspace has applied to a job is owned by its Application
  // (see ApplicationsService). Job-state writes never move an applied job
  // back to "saved"/"discovered"/"dismissed"; they only change the flags.

  async saveJob(workspaceId: string, jobId: string): Promise<JobOpportunity> {
    await this.requireJob(jobId);
    const applied = await this.applicationsService.hasAppliedToJob(
      workspaceId,
      jobId,
    );

    await this.repository.upsertWorkspaceJobState(workspaceId, jobId, {
      isSaved: true,
      status: applied ? 'applied' : 'saved',
    });

    return this.getEnrichedOpportunity(workspaceId, jobId);
  }

  async dismissJob(
    workspaceId: string,
    jobId: string,
  ): Promise<JobOpportunity> {
    await this.requireJob(jobId);
    const applied = await this.applicationsService.hasAppliedToJob(
      workspaceId,
      jobId,
    );

    await this.repository.upsertWorkspaceJobState(workspaceId, jobId, {
      isDismissed: true,
      status: applied ? 'applied' : 'dismissed',
    });

    return this.getEnrichedOpportunity(workspaceId, jobId);
  }

  async restoreJob(
    workspaceId: string,
    jobId: string,
  ): Promise<JobOpportunity> {
    await this.requireJob(jobId);
    const [applied, state] = await Promise.all([
      this.applicationsService.hasAppliedToJob(workspaceId, jobId),
      this.repository.findWorkspaceJobState(workspaceId, jobId),
    ]);

    await this.repository.upsertWorkspaceJobState(workspaceId, jobId, {
      isDismissed: false,
      status: applied ? 'applied' : state?.isSaved ? 'saved' : 'discovered',
    });

    return this.getEnrichedOpportunity(workspaceId, jobId);
  }

  /**
   * Mark a job as applied. Delegates to the Application CRM so an Application
   * exists (recording the supplied resume profile) and job state agrees.
   */
  async applyToJob(
    workspaceId: string,
    jobId: string,
    options?: { resumeProfileId?: string; notes?: string; appliedAt?: Date },
  ): Promise<JobOpportunity> {
    await this.applicationsService.markApplied(workspaceId, jobId, options);
    return this.getEnrichedOpportunity(workspaceId, jobId);
  }

  async updateJobState(
    workspaceId: string,
    jobId: string,
    data: {
      status?: WorkspaceJobStatus;
      isSaved?: boolean;
      notes?: string;
      appliedAt?: string;
    },
  ): Promise<JobOpportunity> {
    await this.requireJob(jobId);

    if (
      data.status !== undefined &&
      !WORKSPACE_JOB_STATUSES.includes(data.status)
    ) {
      throw new BadRequestException(
        `Invalid job status "${data.status}". Valid values: ${WORKSPACE_JOB_STATUSES.join(', ')}.`,
      );
    }
    if (data.status && APPLICATION_OWNED_STATUSES.includes(data.status)) {
      throw new BadRequestException(
        `Status "${data.status}" is an application stage; update it through the application instead.`,
      );
    }
    if (data.appliedAt !== undefined && data.status !== 'applied') {
      throw new BadRequestException(
        'appliedAt can only be set together with status "applied".',
      );
    }

    if (data.status === 'applied') {
      const appliedAt = data.appliedAt ? new Date(data.appliedAt) : undefined;
      if (appliedAt && Number.isNaN(appliedAt.getTime())) {
        throw new BadRequestException('appliedAt must be a valid ISO date.');
      }
      await this.applicationsService.markApplied(workspaceId, jobId, {
        appliedAt,
      });
    }

    let status: WorkspaceJobStatus | undefined;
    if (data.status && data.status !== 'applied') {
      const applied = await this.applicationsService.hasAppliedToJob(
        workspaceId,
        jobId,
      );
      status = applied ? 'applied' : data.status;
    }

    if (
      status !== undefined ||
      data.isSaved !== undefined ||
      data.notes !== undefined
    ) {
      await this.repository.upsertWorkspaceJobState(workspaceId, jobId, {
        status,
        isSaved: data.isSaved,
        notes: data.notes,
      });
    }

    return this.getEnrichedOpportunity(workspaceId, jobId);
  }

  /**
   * Enrich one job with workspace state and a stored match. When
   * resumeProfileId is given, the match for that resume profile is returned;
   * otherwise the profile-agnostic (Master Career Profile) match.
   */
  async getEnrichedOpportunity(
    workspaceId: string,
    jobId: string,
    resumeProfileId?: string,
  ): Promise<JobOpportunity> {
    const job = await this.requireJob(jobId);

    const [match, state] = await Promise.all([
      this.repository.findJobMatch(jobId, workspaceId, resumeProfileId),
      this.repository.findWorkspaceJobState(workspaceId, jobId),
    ]);

    return this.toEnrichedOpportunity(
      job,
      match ?? undefined,
      state ?? undefined,
    );
  }

  // ── Admin / Ingestion ──────────────────────────────────────────────────

  async ingestJobs(
    workspaceId: string,
    params: {
      query?: string;
      location?: string;
      limit?: number;
      source?: string;
    },
  ) {
    let resolvedQuery = params.query;
    if (!resolvedQuery) {
      const masterProfile =
        await this.careerProfileService.findByWorkspace(workspaceId);
      if (masterProfile?.identity.headline) {
        resolvedQuery = masterProfile.identity.headline
          .split(/[·|]/)[0]
          ?.trim();
      }
    }

    const result = await this.ingestionService.ingest({
      query: resolvedQuery ?? 'Software Engineer',
      location: params.location,
      limit: params.limit ?? 20,
      source: params.source,
    });

    const jobs = await this.listByWorkspace(workspaceId, {
      query: params.query,
    });

    return {
      source: result.source,
      fetchedCount: result.fetchedCount,
      createdCount: result.createdCount,
      updatedCount: result.updatedCount,
      skippedCount: result.skippedCount,
      jobs,
    };
  }

  async createJob(input: CreateJobInput): Promise<CanonicalJob> {
    return this.repository.upsertCanonicalJob(input);
  }

  async findJobById(id: string): Promise<CanonicalJob | null> {
    return this.repository.findJobById(id);
  }

  // ── Targeted Resume Generation & Analysis ─────────────────────────────

  async analyzeJob(
    jobId: string,
    workspaceId: string,
  ): Promise<JobAnalysisResult> {
    const job = await this.requireJob(jobId);

    const masterProfile =
      await this.careerProfileService.findByWorkspace(workspaceId);
    if (!masterProfile) {
      throw new NotFoundException(
        `No career profile found for workspace ${workspaceId}.`,
      );
    }

    const matchOutput = this.matchingService.match({ job, masterProfile });
    return this.jobAnalysisService.analyze(job, matchOutput, masterProfile);
  }

  async recommendResumeProfile(workspaceId: string, jobId: string) {
    const job = await this.requireJob(jobId);

    const masterProfile =
      await this.careerProfileService.findByWorkspace(workspaceId);
    if (!masterProfile) {
      throw new NotFoundException(
        `No career profile found for workspace ${workspaceId}.`,
      );
    }

    const profiles =
      await this.resumeProfileService.listByWorkspace(workspaceId);

    if (profiles.length === 0) {
      const defaultProfile = await this.resumeProfileService.create(
        workspaceId,
        {
          name: `Targeted (${job.company} - ${job.title})`,
          roleFocus: job.title,
          visibleSections: [
            'identity',
            'summary',
            'experience',
            'skills',
            'projects',
            'education',
          ],
          sectionOrder: [
            'identity',
            'summary',
            'experience',
            'skills',
            'projects',
            'education',
          ],
        },
      );
      return defaultProfile;
    }

    let bestProfile = profiles[0];
    let bestScore = -1;

    for (const profile of profiles) {
      const match = this.matchingService.match({
        job,
        masterProfile,
        resumeProfile: profile,
      });
      if (match.overallScore > bestScore) {
        bestScore = match.overallScore;
        bestProfile = profile;
      }
    }

    return bestProfile;
  }

  async createTargetedResumeVersion(
    jobId: string,
    workspaceId: string,
    resumeProfileId?: string,
  ) {
    const job = await this.requireJob(jobId);

    const masterProfile =
      await this.careerProfileService.findByWorkspace(workspaceId);
    if (!masterProfile) {
      throw new NotFoundException(
        `No career profile found for workspace ${workspaceId}. Please create one first.`,
      );
    }

    // A supplied resume profile is honored or rejected — never silently swapped.
    const targetProfile = resumeProfileId
      ? await this.requireResumeProfile(workspaceId, resumeProfileId)
      : await this.recommendResumeProfile(workspaceId, jobId);

    const matchOutput = this.matchingService.match({
      job,
      masterProfile,
      resumeProfile: targetProfile,
    });

    const analysis = this.jobAnalysisService.analyze(
      job,
      matchOutput,
      masterProfile,
    );

    const matchedSkillKeys = new Set(
      matchOutput.matchedSkills.map((s) => canonicalSkillKey(s)),
    );

    const prioritySkillIds = masterProfile.skills
      .filter((s) => matchedSkillKeys.has(canonicalSkillKey(s.name)))
      .map((s) => s.id);

    const priorityProjectIds = masterProfile.projects
      .filter((p) =>
        (p.technologies ?? []).some((tech) =>
          matchedSkillKeys.has(canonicalSkillKey(tech)),
        ),
      )
      .map((p) => p.id);

    const priorityExperienceIds = masterProfile.experiences
      .filter((e) =>
        (e.technologies ?? []).some((tech) =>
          matchedSkillKeys.has(canonicalSkillKey(tech)),
        ),
      )
      .map((e) => e.id);

    const version = await this.resumeProfileService.createVersion(
      workspaceId,
      targetProfile.id,
      {
        targetCompany: job.company,
        targetRole: job.title,
        outputFormat: 'html',
        selectedRecordIds: {
          skillIds: prioritySkillIds,
          projectIds: priorityProjectIds,
          experienceIds: priorityExperienceIds,
          achievementIds: [],
          certificationIds: [],
        },
        jobAnalysisEvidence: analysis as unknown as Record<string, unknown>,
        matchResult: matchOutput as unknown as Record<string, unknown>,
        confidence: matchOutput.confidence,
        explanation: matchOutput.explanation,
        artifactMetadata: {
          jobId: job.id,
          source: job.source,
          createdFrom: 'job_radar',
        },
      },
    );

    return {
      version,
      analysis,
      profile: targetProfile,
    };
  }

  // ── Internal helpers ───────────────────────────────────────────────────

  private async requireJob(jobId: string): Promise<CanonicalJob> {
    const job = await this.repository.findJobById(jobId);
    if (!job) throw new NotFoundException(`Job ${jobId} not found.`);
    return job;
  }

  /** Resolve a resume profile in this workspace, or 404. */
  private async requireResumeProfile(
    workspaceId: string,
    resumeProfileId: string,
  ): Promise<ResumeProfile> {
    let profile: ResumeProfile | undefined;
    try {
      profile = await this.resumeProfileService.findById(
        workspaceId,
        resumeProfileId,
      );
    } catch (error) {
      if (!(error instanceof ResumeProfileValidationError)) throw error;
    }
    if (!profile) {
      throw new NotFoundException(
        `Resume profile ${resumeProfileId} not found.`,
      );
    }
    return profile;
  }

  /** The single JobOpportunity contract shared by the list and Job Detail. */
  private toEnrichedOpportunity(
    job: CanonicalJob,
    match: StoredJobMatch | undefined,
    state: JobStateView | undefined,
  ): JobOpportunity {
    const evidence = match
      ? (match.evidence ?? {
          matchedSkills: match.matchedSkills,
          missingSkills: match.missingSkills,
          matchedPreferredSkills: [],
          profileSkillCount: 0,
          requiredSkillCount: job.requiredSkills.length,
          experienceYears: 0,
        })
      : undefined;

    const appliedAt =
      state?.appliedAt instanceof Date
        ? state.appliedAt.toISOString()
        : (state?.appliedAt ?? undefined);

    return {
      ...this.toOpportunity(job),
      matchScore: match ? Math.round(match.overallScore * 100) : undefined,
      whyFits: match?.explanation ?? undefined,
      missingSkills: match?.missingSkills ?? undefined,
      matchEvidence: match
        ? {
            skillScore: Math.round(match.skillScore * 100),
            roleScore: Math.round(match.roleScore * 100),
            experienceScore: Math.round(match.experienceScore * 100),
            locationScore: Math.round(match.locationScore * 100),
            seniorityScore: Math.round(match.seniorityScore * 100),
            matchedSkills: match.matchedSkills,
            missingSkills: match.missingSkills,
            reasons: match.explanation ? [match.explanation] : [],
            confidence: match.confidence,
          }
        : undefined,
      match:
        match && evidence
          ? {
              overallScore: match.overallScore,
              dimensionScores: {
                skill: match.skillScore,
                role: match.roleScore,
                experience: match.experienceScore,
                location: match.locationScore,
                seniority: match.seniorityScore,
              },
              matchedSkills: match.matchedSkills,
              missingSkills: match.missingSkills,
              confidence: match.confidence,
              explanation: match.explanation,
              evidence,
              profileVersion: match.profileVersion ?? undefined,
              resumeProfileId: match.resumeProfileId ?? undefined,
            }
          : undefined,
      workspaceState: state
        ? {
            status: state.status as WorkspaceJobStatus,
            isSaved: state.isSaved,
            isDismissed: state.isDismissed,
            notes: state.notes ?? undefined,
            appliedAt,
          }
        : undefined,
    };
  }

  private toOpportunity(
    job: CanonicalJob,
  ): Omit<JobOpportunity, 'match' | 'workspaceState'> {
    return {
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      isRemote: job.isRemote,
      remotePolicy: job.remotePolicy ?? undefined,
      seniority: job.seniority ?? undefined,
      experienceRequirements: job.experienceRequirements ?? undefined,
      employmentType: job.employmentType ?? undefined,
      salaryRange: job.salaryRange ?? undefined,
      description: job.description ?? undefined,
      requiredSkills: job.requiredSkills,
      preferredSkills: job.preferredSkills,
      postedAt: job.postedAt ?? undefined,
      source: job.source,
      sourceUrl: job.sourceUrl ?? undefined,
    };
  }
}
