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
import type { CreateJobInput, ListJobsQuery } from './jobs.types';
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
   * List jobs for a workspace, merging in stored match results and workspace
   * interaction state.  Does NOT run matching — use computeAndPersistMatch.
   */
  async listByWorkspace(
    workspaceId: string,
    query?: ListJobsQuery,
  ): Promise<JobOpportunity[]> {
    const jobs = await this.repository.listJobs(query);
    if (jobs.length === 0) return [];

    const jobIds = jobs.map((j) => j.id);

    // Load stored matches for this workspace (no specific profile — profile-agnostic).
    const storedMatches =
      await this.repository.listJobMatchesForWorkspace(workspaceId);
    const matchMap = new Map(storedMatches.map((m) => [m.jobId, m]));

    // Load workspace interaction states in one query.
    const stateMap = await this.repository.findWorkspaceStatesForJobs(
      workspaceId,
      jobIds,
    );

    return jobs.map((job): JobOpportunity => {
      const m = matchMap.get(job.id);
      const s = stateMap.get(job.id);

      return {
        ...this.toOpportunity(job),
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
              evidence: m.evidence ?? {
                matchedSkills: m.matchedSkills,
                missingSkills: m.missingSkills,
                matchedPreferredSkills: [],
                profileSkillCount: 0,
                requiredSkillCount: job.requiredSkills.length,
                experienceYears: 0,
              },
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
  }

  // ── Matching (explicit, separate from listing) ─────────────────────────

  /**
   * Run the deterministic matching engine for one job × workspace, optionally
   * scoped to a specific ResumeProfile.  Persists the result and returns the
   * enriched JobOpportunity.
   *
   * Weights default to DEFAULT_MATCHING_WEIGHTS but callers can pass overrides.
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
    );

    this.logger.log(
      `Matched job ${job.title} @ ${job.company} for workspace ${workspaceId}: ` +
        `${Math.round(output.overallScore * 100)}/100`,
    );

    return {
      ...this.toOpportunity(job),
      match: {
        overallScore: output.overallScore,
        dimensionScores: output.dimensionScores,
        matchedSkills: output.matchedSkills,
        missingSkills: output.missingSkills,
        confidence: output.confidence,
        explanation: output.explanation,
        evidence: output.evidence,
      },
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
      query: params.query || 'Software Engineer',
      location: params.location,
      limit: params.limit || 20,
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

    if (!targetProfile) {
      targetProfile = await this.recommendResumeProfile(workspaceId, jobId);
    }

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

    const prioritySkillIds = (masterProfile.skills ?? [])
      .filter((s) => matchedSkillNames.has(s.name.toLowerCase()))
      .map((s) => s.id);

    const priorityProjectIds = (masterProfile.projects ?? [])
      .filter((p) =>
        (p.technologies ?? []).some((tech) =>
          matchedSkillNames.has(tech.toLowerCase()),
        ),
      )
      .map((p) => p.id);

    const priorityExperienceIds = (masterProfile.experiences ?? [])
      .filter((e) =>
        (e.technologies ?? []).some((tech) =>
          matchedSkillNames.has(tech.toLowerCase()),
        ),
      )
      .map((e) => e.id);

    if (
      prioritySkillIds.length > 0 ||
      priorityProjectIds.length > 0 ||
      priorityExperienceIds.length > 0
    ) {
      await this.resumeProfileService.update(workspaceId, targetProfile.id, {
        name: targetProfile.name,
        roleFocus: targetProfile.roleFocus ?? job.title,
        visibleSections: targetProfile.visibleSections,
        sectionOrder: targetProfile.sectionOrder,
        summaryGuidance: `Tailored for ${job.title} at ${job.company}. Emphasizing ${matchOutput.matchedSkills.slice(0, 3).join(', ')}.`,
        prioritySkillIds: Array.from(
          new Set([...targetProfile.prioritySkillIds, ...prioritySkillIds]),
        ),
        priorityProjectIds: Array.from(
          new Set([...targetProfile.priorityProjectIds, ...priorityProjectIds]),
        ),
        priorityExperienceIds: Array.from(
          new Set([
            ...targetProfile.priorityExperienceIds,
            ...priorityExperienceIds,
          ]),
        ),
        priorityAchievementIds: targetProfile.priorityAchievementIds,
        priorityCertificationIds: targetProfile.priorityCertificationIds,
        highlightRules: targetProfile.highlightRules,
        templateId: targetProfile.templateId,
        styleSettings: targetProfile.styleSettings,
      });
    }

    const version = await this.resumeProfileService.createVersion(
      workspaceId,
      targetProfile.id,
      {
        targetCompany: job.company,
        targetRole: job.title,
        outputFormat: 'html',
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
