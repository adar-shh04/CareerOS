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
import { deriveJobStateStatus } from './job-state';
import type {
  CreateJobInput,
  ListJobsQuery,
  StoredJobMatch,
} from './jobs.types';
import { currentMatchSource, isMatchFresh } from './match-freshness';
import { PrismaJobsRepository } from './prisma-jobs.repository';
import { canonicalSkillKey } from './skill-identity';

/** Statuses accepted by PATCH /state for backward compatibility (mapped to flags). */
const LEGACY_STATE_STATUSES = [
  'discovered',
  'saved',
  'applied',
  'dismissed',
] as const;

/** Pipeline stages owned by the Application record, not settable via job state. */
const APPLICATION_OWNED_STATUSES = ['interview', 'offer', 'rejected'];

/** Jobs matched per batch when refreshing stale matches (bounded memory). */
const MATCH_BATCH_SIZE = 250;

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 50;

/** Workspace job state in the shape the enrichment mapper consumes. */
interface JobStateView {
  status: string;
  isSaved: boolean;
  isDismissed: boolean;
  notes?: string | null;
  appliedAt?: Date | string | null;
}

/**
 * Job Radar ranking order (deterministic, independent of database order):
 *   1. fit score, highest first (jobs without a score last)
 *   2. postedAt, newest first; jobs with no posted date after dated ones
 *   3. createdAt, newest first
 *   4. id ascending
 */
export function compareRanked(
  a: {
    id: string;
    score: number | null;
    postedAt: Date | null;
    createdAt: Date;
  },
  b: {
    id: string;
    score: number | null;
    postedAt: Date | null;
    createdAt: Date;
  },
): number {
  const scoreA = a.score ?? -1;
  const scoreB = b.score ?? -1;
  if (scoreA !== scoreB) return scoreB - scoreA;
  const postedA = a.postedAt?.getTime() ?? null;
  const postedB = b.postedAt?.getTime() ?? null;
  if (postedA !== postedB) {
    if (postedA === null) return 1;
    if (postedB === null) return -1;
    return postedB - postedA;
  }
  const createdDiff = b.createdAt.getTime() - a.createdAt.getTime();
  if (createdDiff !== 0) return createdDiff;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
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
   * Job Radar list for a workspace.
   *
   * 1. All jobs matching the filters are selected in the database (filters
   *    never run over a loaded page).
   * 2. Every candidate's Master-Profile match is brought up to date (see
   *    match-freshness.ts) — so fit is known for the whole set.
   * 3. The whole set is ranked (compareRanked), and only then paginated.
   * 4. Full rows, matches and workspace state are loaded for that page only.
   */
  async listByWorkspace(
    workspaceId: string,
    query: ListJobsQuery = {},
  ): Promise<JobOpportunity[]> {
    const limit = Math.min(
      Math.max(query.limit ?? DEFAULT_PAGE_SIZE, 1),
      MAX_PAGE_SIZE,
    );
    const offset = Math.max(query.offset ?? 0, 0);

    const candidates = await this.repository.listCandidateJobs(
      workspaceId,
      query,
    );
    if (candidates.length === 0) return [];

    const scores = await this.ensureFreshGenericMatches(
      workspaceId,
      candidates,
    );

    const pageIds = candidates
      .map((c) => ({ ...c, score: scores.get(c.id) ?? null }))
      .sort(compareRanked)
      .slice(offset, offset + limit)
      .map((c) => c.id);
    if (pageIds.length === 0) return [];

    const [jobs, matches, states] = await Promise.all([
      this.repository.findJobsByIds(pageIds),
      this.repository.findGenericMatchesForJobs(workspaceId, pageIds),
      this.repository.findWorkspaceStatesForJobs(workspaceId, pageIds),
    ]);
    const jobsById = new Map(jobs.map((j) => [j.id, j]));

    return pageIds.flatMap((id) => {
      const job = jobsById.get(id);
      return job
        ? [this.toEnrichedOpportunity(job, matches.get(id), states.get(id))]
        : [];
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
    await this.ensureFreshGenericMatches(workspaceId, [
      { id: job.id, updatedAt: new Date(job.updatedAt) },
    ]);
    return this.getEnrichedOpportunity(workspaceId, jobId);
  }

  // ── Match freshness ────────────────────────────────────────────────────

  /**
   * Make every given job's Master-Profile (generic) match current for the
   * workspace and return jobId → overall score.
   *
   * A stored match is reused only when all of its recorded inputs (matcher
   * version, master profile version, job updatedAt, weights) equal the current
   * ones; otherwise — including legacy rows without that information — it is
   * recomputed. Without a master profile there is nothing to match against,
   * so no scores are returned (stale scores are never shown).
   */
  async ensureFreshGenericMatches(
    workspaceId: string,
    jobs: { id: string; updatedAt: Date }[],
  ): Promise<Map<string, number>> {
    const scores = new Map<string, number>();
    const masterProfile =
      await this.careerProfileService.findByWorkspace(workspaceId);
    if (!masterProfile || jobs.length === 0) return scores;

    const stored = new Map(
      (await this.repository.listGenericMatchSources(workspaceId)).map((r) => [
        r.jobId,
        r,
      ]),
    );

    const staleIds: string[] = [];
    for (const job of jobs) {
      const row = stored.get(job.id);
      const current = currentMatchSource({
        jobUpdatedAt: job.updatedAt,
        profileVersion: masterProfile.version,
      });
      if (row && isMatchFresh(row, current)) {
        scores.set(job.id, row.overallScore);
      } else {
        staleIds.push(job.id);
      }
    }

    for (let i = 0; i < staleIds.length; i += MATCH_BATCH_SIZE) {
      const batch = await this.repository.findJobsByIds(
        staleIds.slice(i, i + MATCH_BATCH_SIZE),
      );
      const entries = batch.map((job) => {
        const output = this.matchingService.match({
          job,
          masterProfile,
          weights: DEFAULT_MATCHING_WEIGHTS,
        });
        scores.set(job.id, output.overallScore);
        return {
          jobId: job.id,
          output,
          source: currentMatchSource({
            jobUpdatedAt: job.updatedAt,
            profileVersion: masterProfile.version,
          }),
        };
      });
      await this.repository.replaceGenericMatches(workspaceId, entries);
    }

    return scores;
  }

  // ── Matching (explicit re-computation with overrides) ──────────────────

  /**
   * Run the deterministic matching engine for one job × workspace, optionally
   * scoped to a specific ResumeProfile or with custom weight overrides.
   * Persists the result with the exact inputs used (profile version, resume
   * profile state, job state, weights) and returns the enriched JobOpportunity
   * carrying the match for exactly that (workspace, job, resumeProfile).
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

    await this.repository.upsertJobMatch(jobId, workspaceId, output, {
      ...currentMatchSource({
        jobUpdatedAt: job.updatedAt,
        profileVersion: masterProfile.version,
        resumeProfileUpdatedAt: resumeProfile?.updatedAt ?? null,
        weights: effectiveWeights,
      }),
      resumeProfileId: resumeProfile?.id,
    });

    this.logger.log(
      `Matched job ${job.title} @ ${job.company} for workspace ${workspaceId}` +
        `${resumeProfile ? ` (resume profile ${resumeProfile.id})` : ''}: ` +
        `${String(Math.round(output.overallScore * 100))}/100`,
    );

    return this.getEnrichedOpportunity(workspaceId, jobId, resumeProfile?.id);
  }

  // ── Workspace Job Interactions (Save, Dismiss, Restore, Notes) ─────────
  //
  // isSaved / isDismissed are the user's Job Radar flags. Whether the
  // workspace applied is owned by its Application (ApplicationsService); the
  // stored status is always derived (see job-state.ts), never set directly.

  async saveJob(workspaceId: string, jobId: string): Promise<JobOpportunity> {
    await this.requireJob(jobId);
    await this.writeJobFlags(workspaceId, jobId, { isSaved: true });
    return this.getEnrichedOpportunity(workspaceId, jobId);
  }

  async dismissJob(
    workspaceId: string,
    jobId: string,
  ): Promise<JobOpportunity> {
    await this.requireJob(jobId);
    await this.writeJobFlags(workspaceId, jobId, { isDismissed: true });
    return this.getEnrichedOpportunity(workspaceId, jobId);
  }

  async restoreJob(
    workspaceId: string,
    jobId: string,
  ): Promise<JobOpportunity> {
    await this.requireJob(jobId);
    await this.writeJobFlags(workspaceId, jobId, { isDismissed: false });
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

  /**
   * Update Job Radar flags and notes. `status` is accepted for backward
   * compatibility and mapped onto the flags ("saved" → isSaved, "dismissed" →
   * isDismissed, "discovered" → neither); explicit flags take precedence.
   * "applied" goes through the Application CRM. Pipeline stages are rejected.
   */
  async updateJobState(
    workspaceId: string,
    jobId: string,
    data: {
      status?: string;
      isSaved?: boolean;
      isDismissed?: boolean;
      notes?: string;
      appliedAt?: string;
    },
  ): Promise<JobOpportunity> {
    await this.requireJob(jobId);

    if (data.status && APPLICATION_OWNED_STATUSES.includes(data.status)) {
      throw new BadRequestException(
        `Status "${data.status}" is an application stage; update it through the application instead.`,
      );
    }
    if (
      data.status !== undefined &&
      !(LEGACY_STATE_STATUSES as readonly string[]).includes(data.status)
    ) {
      throw new BadRequestException(
        `Invalid job status "${data.status}". Valid values: ${LEGACY_STATE_STATUSES.join(', ')}.`,
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

    const fromStatus: { isSaved?: boolean; isDismissed?: boolean } =
      data.status === 'saved'
        ? { isSaved: true }
        : data.status === 'dismissed'
          ? { isDismissed: true }
          : data.status === 'discovered'
            ? { isSaved: false, isDismissed: false }
            : {};

    const change = {
      isSaved: data.isSaved ?? fromStatus.isSaved,
      isDismissed: data.isDismissed ?? fromStatus.isDismissed,
      notes: data.notes,
    };
    if (
      change.isSaved !== undefined ||
      change.isDismissed !== undefined ||
      change.notes !== undefined
    ) {
      await this.writeJobFlags(workspaceId, jobId, change);
    }

    return this.getEnrichedOpportunity(workspaceId, jobId);
  }

  /** Apply flag/notes changes and re-derive status from flags + Application. */
  private async writeJobFlags(
    workspaceId: string,
    jobId: string,
    change: { isSaved?: boolean; isDismissed?: boolean; notes?: string },
  ): Promise<void> {
    const [state, applied] = await Promise.all([
      this.repository.findWorkspaceJobState(workspaceId, jobId),
      this.applicationsService.getAppliedMirror(workspaceId, jobId),
    ]);
    const isSaved = change.isSaved ?? state?.isSaved ?? false;
    const isDismissed = change.isDismissed ?? state?.isDismissed ?? false;

    await this.repository.upsertWorkspaceJobState(workspaceId, jobId, {
      isSaved,
      isDismissed,
      status: deriveJobStateStatus({
        applied: applied !== null,
        isSaved,
        isDismissed,
      }),
      appliedAt: applied?.appliedAt ?? null,
      ...(change.notes !== undefined ? { notes: change.notes } : {}),
    });
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
    return this.jobAnalysisService.analyze(job, matchOutput);
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

    const analysis = this.jobAnalysisService.analyze(job, matchOutput);

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
              matcherVersion: match.matcherVersion ?? undefined,
              computedAt: match.updatedAt.toISOString(),
            }
          : undefined,
      workspaceState: state
        ? {
            status: deriveJobStateStatus({
              applied: state.status === 'applied',
              isSaved: state.isSaved,
              isDismissed: state.isDismissed,
            }),
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
