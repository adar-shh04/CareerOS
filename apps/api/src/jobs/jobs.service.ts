import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type {
  CanonicalJob,
  JobAnalysisResult,
  JobMatchingWeights,
  JobOpportunity,
} from '@repo/types';
import { DEFAULT_MATCHING_WEIGHTS } from '@repo/types';

import { CareerProfileService } from '../career-profile/career-profile.service';
import { ResumeProfileService } from '../resume-profile/resume-profile.service';
import { JobIngestionService } from './ingestion/job-ingestion.service';
import { JobAnalysisService } from './job-analysis.service';
import { JobMatchingService } from './job-matching.service';
import type {
  CreateJobInput,
  ListJobsQuery,
  StoredJobMatch,
} from './jobs.types';
import { PrismaJobsRepository } from './prisma-jobs.repository';

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

    const opportunities = jobs.map((job): JobOpportunity => {
      const m = matchMap.get(job.id);
      const s = stateMap.get(job.id);

      const matchEvidence =
        m?.evidence ??
        (m
          ? {
              matchedSkills: m.matchedSkills,
              missingSkills: m.missingSkills,
              matchedPreferredSkills: [],
              profileSkillCount: 0,
              requiredSkillCount: job.requiredSkills.length,
              experienceYears: 0,
            }
          : undefined);

      return {
        ...this.toOpportunity(job),
        matchScore: m ? Math.round(m.overallScore * 100) : undefined,
        whyFits: m?.explanation ?? undefined,
        missingSkills: m?.missingSkills ?? undefined,
        matchEvidence: m
          ? {
              skillScore: Math.round(m.skillScore * 100),
              roleScore: Math.round(m.roleScore * 100),
              experienceScore: Math.round(m.experienceScore * 100),
              locationScore: Math.round(m.locationScore * 100),
              seniorityScore: Math.round(m.seniorityScore * 100),
              matchedSkills: m.matchedSkills,
              missingSkills: m.missingSkills,
              reasons: m.explanation ? [m.explanation] : [],
              confidence: m.confidence,
            }
          : undefined,
        match: m
          ? {
              overallScore: m.overallScore,
              dimensionScores: {
                skill: m.skillScore,
                role: m.roleScore,
                experience: m.experienceScore,
                location: m.locationScore,
                seniority: m.seniorityScore,
              },
              matchedSkills: m.matchedSkills,
              missingSkills: m.missingSkills,
              confidence: m.confidence,
              explanation: m.explanation,
              evidence: matchEvidence ?? {
                matchedSkills: m.matchedSkills,
                missingSkills: m.missingSkills,
                matchedPreferredSkills: [],
                profileSkillCount: 0,
                requiredSkillCount: job.requiredSkills.length,
                experienceYears: 0,
              },
              profileVersion: m.profileVersion ?? undefined,
            }
          : undefined,
        workspaceState: s
          ? {
              status:
                s.status as JobOpportunity['workspaceState'] extends infer T
                  ? T extends { status: infer S }
                    ? S
                    : never
                  : never,
              isSaved: s.isSaved,
              isDismissed: s.isDismissed,
              notes: s.notes ?? undefined,
              appliedAt: s.appliedAt?.toISOString() ?? undefined,
            }
          : undefined,
      };
    });

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
   * Persists the result and returns the enriched JobOpportunity.
   */
  async computeAndPersistMatch(
    jobId: string,
    workspaceId: string,
    resumeProfileId?: string,
    weights?: Partial<JobMatchingWeights>,
  ): Promise<JobOpportunity> {
    const job = await this.repository.findJobById(jobId);
    if (!job) throw new NotFoundException(`Job ${jobId} not found.`);

    const masterProfile =
      await this.careerProfileService.findByWorkspace(workspaceId);
    if (!masterProfile) {
      throw new NotFoundException(
        `No career profile found for workspace ${workspaceId}. Please complete your profile first.`,
      );
    }

    let resumeProfile:
      | Awaited<ReturnType<ResumeProfileService['findById']>>
      | undefined;
    if (resumeProfileId) {
      const rp = await this.resumeProfileService.findById(
        workspaceId,
        resumeProfileId,
      );
      resumeProfile = rp ?? undefined;
    }

    const effectiveWeights: JobMatchingWeights = {
      ...DEFAULT_MATCHING_WEIGHTS,
      ...weights,
    };

    const output = this.matchingService.match({
      job,
      masterProfile,
      resumeProfile: resumeProfile ?? undefined,
      weights: effectiveWeights,
    });

    await this.repository.upsertJobMatch(
      jobId,
      workspaceId,
      output,
      resumeProfileId,
      masterProfile.version,
    );

    this.logger.log(
      `Matched job ${job.title} @ ${job.company} for workspace ${workspaceId}: ` +
        `${String(Math.round(output.overallScore * 100))}/100`,
    );

    return this.getEnrichedOpportunity(workspaceId, jobId);
  }

  // ── Workspace Job Interactions (Save, Dismiss, Restore, Notes) ─────────

  async saveJob(workspaceId: string, jobId: string): Promise<JobOpportunity> {
    const job = await this.repository.findJobById(jobId);
    if (!job) throw new NotFoundException(`Job ${jobId} not found.`);

    await this.repository.upsertWorkspaceJobState(workspaceId, jobId, {
      isSaved: true,
      status: 'saved',
    });

    return this.getEnrichedOpportunity(workspaceId, jobId);
  }

  async dismissJob(
    workspaceId: string,
    jobId: string,
  ): Promise<JobOpportunity> {
    const job = await this.repository.findJobById(jobId);
    if (!job) throw new NotFoundException(`Job ${jobId} not found.`);

    await this.repository.upsertWorkspaceJobState(workspaceId, jobId, {
      isDismissed: true,
      status: 'dismissed',
    });

    return this.getEnrichedOpportunity(workspaceId, jobId);
  }

  async restoreJob(
    workspaceId: string,
    jobId: string,
  ): Promise<JobOpportunity> {
    const job = await this.repository.findJobById(jobId);
    if (!job) throw new NotFoundException(`Job ${jobId} not found.`);

    await this.repository.upsertWorkspaceJobState(workspaceId, jobId, {
      isDismissed: false,
      status: 'discovered',
    });

    return this.getEnrichedOpportunity(workspaceId, jobId);
  }

  async updateJobState(
    workspaceId: string,
    jobId: string,
    data: {
      status?: JobOpportunity['workspaceState'] extends infer T
        ? T extends { status: infer S }
          ? S
          : never
        : never;
      notes?: string;
      appliedAt?: string;
    },
  ): Promise<JobOpportunity> {
    const job = await this.repository.findJobById(jobId);
    if (!job) throw new NotFoundException(`Job ${jobId} not found.`);

    await this.repository.upsertWorkspaceJobState(workspaceId, jobId, {
      status: data.status,
      notes: data.notes,
      appliedAt: data.appliedAt ? new Date(data.appliedAt) : undefined,
    });

    return this.getEnrichedOpportunity(workspaceId, jobId);
  }

  async getEnrichedOpportunity(
    workspaceId: string,
    jobId: string,
  ): Promise<JobOpportunity> {
    const job = await this.repository.findJobById(jobId);
    if (!job) throw new NotFoundException(`Job ${jobId} not found.`);

    const match = await this.repository.findJobMatch(jobId, workspaceId);
    const state = await this.repository.findWorkspaceJobState(
      workspaceId,
      jobId,
    );

    const matchEvidence =
      match?.evidence ??
      (match
        ? {
            matchedSkills: match.matchedSkills,
            missingSkills: match.missingSkills,
            matchedPreferredSkills: [],
            profileSkillCount: 0,
            requiredSkillCount: job.requiredSkills.length,
            experienceYears: 0,
          }
        : undefined);

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
      match: match
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
            evidence: matchEvidence ?? {
              matchedSkills: match.matchedSkills,
              missingSkills: match.missingSkills,
              matchedPreferredSkills: [],
              profileSkillCount: 0,
              requiredSkillCount: job.requiredSkills.length,
              experienceYears: 0,
            },
            profileVersion: match.profileVersion ?? undefined,
          }
        : undefined,
      workspaceState: state
        ? {
            status: state.status,
            isSaved: state.isSaved,
            isDismissed: state.isDismissed,
            notes: state.notes ?? undefined,
            appliedAt: state.appliedAt ?? undefined,
          }
        : undefined,
    };
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
    const result = await this.ingestionService.ingest({
      query: params.query ?? 'Software Engineer',
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
    const job = await this.repository.findJobById(jobId);
    if (!job) throw new NotFoundException(`Job ${jobId} not found.`);

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
    const job = await this.repository.findJobById(jobId);
    if (!job) throw new NotFoundException(`Job ${jobId} not found.`);

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
    const job = await this.repository.findJobById(jobId);
    if (!job) throw new NotFoundException(`Job ${jobId} not found.`);

    const masterProfile =
      await this.careerProfileService.findByWorkspace(workspaceId);
    if (!masterProfile) {
      throw new NotFoundException(
        `No career profile found for workspace ${workspaceId}. Please create one first.`,
      );
    }

    let targetProfile = resumeProfileId
      ? await this.resumeProfileService.findById(workspaceId, resumeProfileId)
      : await this.recommendResumeProfile(workspaceId, jobId);

    targetProfile ??= await this.recommendResumeProfile(workspaceId, jobId);

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

    const matchedSkillNames = new Set(
      matchOutput.matchedSkills.map((s) => s.toLowerCase()),
    );

    const prioritySkillIds = masterProfile.skills
      .filter((s) => matchedSkillNames.has(s.name.toLowerCase()))
      .map((s) => s.id);

    const priorityProjectIds = masterProfile.projects
      .filter((p) =>
        (p.technologies ?? []).some((tech) =>
          matchedSkillNames.has(tech.toLowerCase()),
        ),
      )
      .map((p) => p.id);

    const priorityExperienceIds = masterProfile.experiences
      .filter((e) =>
        (e.technologies ?? []).some((tech) =>
          matchedSkillNames.has(tech.toLowerCase()),
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
