import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { CanonicalJob } from '@repo/types';

import type { ApplicationsService } from '../applications/applications.service';
import type { CareerProfileService } from '../career-profile/career-profile.service';
import type { MasterCareerProfile } from '../career-profile/career-profile.types';
import type { ResumeProfileService } from '../resume-profile/resume-profile.service';
import type { JobIngestionService } from './ingestion/job-ingestion.service';
import { JobAnalysisService } from './job-analysis.service';
import { JobMatchingService } from './job-matching.service';
import { JobsService } from './jobs.service';
import type { StoredJobMatch } from './jobs.types';
import type { PrismaJobsRepository } from './prisma-jobs.repository';

describe('JobsService', () => {
  let service: JobsService;
  let mockRepository: {
    listJobs: jest.Mock;
    findJobById: jest.Mock;
    upsertCanonicalJob: jest.Mock;
    upsertJobMatch: jest.Mock;
    findJobMatch: jest.Mock;
    listJobMatchesForWorkspace: jest.Mock;
    upsertWorkspaceJobState: jest.Mock;
    findWorkspaceJobState: jest.Mock;
    findWorkspaceStatesForJobs: jest.Mock;
  };
  let mockCareerProfileService: {
    findByWorkspace: jest.Mock;
  };
  let mockResumeProfileService: {
    findById: jest.Mock;
    listByWorkspace: jest.Mock;
    create: jest.Mock;
    createVersion: jest.Mock;
  };
  let mockIngestionService: {
    ingest: jest.Mock;
  };
  let mockApplicationsService: {
    hasAppliedToJob: jest.Mock;
    markApplied: jest.Mock;
  };
  let matchingService: JobMatchingService;
  let jobAnalysisService: JobAnalysisService;

  const workspaceId = 'ws-test-123';

  const sampleMasterProfile: MasterCareerProfile = {
    id: 'prof-1',
    workspaceId,
    version: 1,
    createdAt: '2026-08-18T00:00:00.000Z',
    updatedAt: '2026-08-18T00:00:00.000Z',
    identity: {
      fullName: 'Jane Developer',
      location: 'San Francisco, CA',
    },
    skills: [
      { id: 'sk-1', name: 'TypeScript' },
      { id: 'sk-2', name: 'Node.js' },
      { id: 'sk-3', name: 'React' },
    ],
    technologies: [
      { id: 'tech-1', name: 'TypeScript' },
      { id: 'tech-2', name: 'PostgreSQL' },
    ],
    experiences: [
      {
        id: 'exp-1',
        company: 'Acme Corp',
        title: 'Full Stack Engineer',
        startDate: '2022-01-01',
        endDate: '2024-01-01',
        technologies: ['TypeScript', 'React'],
      },
    ],
    projects: [
      {
        id: 'proj-1',
        name: 'Open Source SaaS',
        technologies: ['TypeScript', 'Node.js'],
      },
    ],
    education: [],
    achievements: [],
    publications: [],
    hackathons: [],
    certifications: [],
    links: [],
  };

  const sampleJobA: CanonicalJob = {
    id: 'job-a',
    company: 'Stripe',
    title: 'Senior TypeScript Engineer',
    location: 'San Francisco, CA',
    isRemote: true,
    requiredSkills: ['TypeScript', 'Node.js', 'React'],
    preferredSkills: ['PostgreSQL'],
    source: 'manual',
    createdAt: '2026-08-18T00:00:00.000Z',
    updatedAt: '2026-08-18T00:00:00.000Z',
  };

  const sampleJobB: CanonicalJob = {
    id: 'job-b',
    company: 'OldCo',
    title: 'C++ Systems Programmer',
    location: 'Munich, Germany',
    isRemote: false,
    requiredSkills: ['C++', 'Assembly', 'Rust'],
    preferredSkills: ['Linux Kernel'],
    source: 'manual',
    createdAt: '2026-08-18T00:00:00.000Z',
    updatedAt: '2026-08-18T00:00:00.000Z',
  };

  beforeEach(() => {
    matchingService = new JobMatchingService();
    jobAnalysisService = new JobAnalysisService();

    mockRepository = {
      listJobs: jest.fn(),
      findJobById: jest.fn(),
      upsertCanonicalJob: jest.fn(),
      upsertJobMatch: jest.fn(),
      findJobMatch: jest.fn(),
      listJobMatchesForWorkspace: jest.fn(),
      upsertWorkspaceJobState: jest.fn(),
      findWorkspaceJobState: jest.fn(),
      findWorkspaceStatesForJobs: jest.fn(),
    };

    mockCareerProfileService = {
      findByWorkspace: jest.fn(),
    };

    mockResumeProfileService = {
      findById: jest.fn(),
      listByWorkspace: jest.fn(),
      create: jest.fn(),
      createVersion: jest.fn(),
    };

    mockIngestionService = {
      ingest: jest.fn(),
    };

    mockApplicationsService = {
      hasAppliedToJob: jest.fn().mockResolvedValue(false),
      markApplied: jest.fn(),
    };

    service = new JobsService(
      mockRepository as unknown as PrismaJobsRepository,
      matchingService,
      jobAnalysisService,
      mockCareerProfileService as unknown as CareerProfileService,
      mockResumeProfileService as unknown as ResumeProfileService,
      mockIngestionService as unknown as JobIngestionService,
      mockApplicationsService as unknown as ApplicationsService,
    );
  });

  describe('ensureJobMatches and listByWorkspace', () => {
    it('automatically matches unmatched jobs and sorts results by overall score descending', async () => {
      mockRepository.listJobs.mockResolvedValue([sampleJobB, sampleJobA]);
      mockCareerProfileService.findByWorkspace.mockResolvedValue(
        sampleMasterProfile,
      );
      mockRepository.listJobMatchesForWorkspace.mockResolvedValue([]);
      mockRepository.findWorkspaceStatesForJobs.mockResolvedValue(new Map());

      mockRepository.upsertJobMatch.mockImplementation(
        async (
          jobId: string,
          wsId: string,
          output: {
            overallScore: number;
            dimensionScores: {
              skill: number;
              role: number;
              experience: number;
              location: number;
              seniority: number;
            };
            matchedSkills: string[];
            missingSkills: string[];
            confidence: number;
            explanation: string;
            evidence: null;
          },
          _profileId?: string,
          profileVersion?: number,
        ) => {
          return Promise.resolve({
            id: `match-${jobId}`,
            jobId,
            workspaceId: wsId,
            overallScore: output.overallScore,
            skillScore: output.dimensionScores.skill,
            roleScore: output.dimensionScores.role,
            experienceScore: output.dimensionScores.experience,
            locationScore: output.dimensionScores.location,
            seniorityScore: output.dimensionScores.seniority,
            matchedSkills: output.matchedSkills,
            missingSkills: output.missingSkills,
            confidence: output.confidence,
            explanation: output.explanation,
            evidence: output.evidence,
            profileVersion,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        },
      );

      const result = await service.listByWorkspace(workspaceId);

      expect(result.length).toBe(2);
      // Job A (High TypeScript match) should be ranked higher than Job B (C++)
      expect(result[0].id).toBe('job-a');
      expect(result[1].id).toBe('job-b');
      expect(result[0].matchScore).toBeGreaterThan(result[1].matchScore ?? 0);
      expect(mockRepository.upsertJobMatch).toHaveBeenCalledTimes(2);
    });

    it('respects maxBatchSize bound in ensureJobMatches', async () => {
      const manyJobs: CanonicalJob[] = Array.from({ length: 10 }, (_, i) => ({
        ...sampleJobA,
        id: `job-${String(i)}`,
      }));

      mockCareerProfileService.findByWorkspace.mockResolvedValue(
        sampleMasterProfile,
      );
      mockRepository.listJobMatchesForWorkspace.mockResolvedValue([]);
      mockRepository.upsertJobMatch.mockImplementation((jobId: string) =>
        Promise.resolve({
          id: `m-${jobId}`,
          jobId,
          workspaceId,
          overallScore: 0.9,
          skillScore: 1,
          roleScore: 1,
          experienceScore: 1,
          locationScore: 1,
          seniorityScore: 1,
          matchedSkills: ['TypeScript'],
          missingSkills: [],
          confidence: 1,
          explanation: 'Fit',
          evidence: null,
          profileVersion: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      // Bound to 3 matches max
      const matchMap = await service.ensureJobMatches(workspaceId, manyJobs, 3);

      expect(mockRepository.upsertJobMatch).toHaveBeenCalledTimes(3);
      expect(matchMap.size).toBe(3);
    });

    it('recalculates matches when stored match profileVersion is stale', async () => {
      const staleMasterProfile: MasterCareerProfile = {
        ...sampleMasterProfile,
        version: 2, // User updated their profile to version 2
      };

      mockCareerProfileService.findByWorkspace.mockResolvedValue(
        staleMasterProfile,
      );

      const existingStaleMatch: StoredJobMatch = {
        id: 'match-stale-a',
        jobId: 'job-a',
        workspaceId,
        overallScore: 0.5,
        skillScore: 0.5,
        roleScore: 0.5,
        experienceScore: 0.5,
        locationScore: 0.5,
        seniorityScore: 0.5,
        matchedSkills: [],
        missingSkills: [],
        confidence: 1,
        explanation: 'Old match',
        evidence: null,
        profileVersion: 1, // Computed against version 1 -> Stale!
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.listJobMatchesForWorkspace.mockResolvedValue([
        existingStaleMatch,
      ]);
      mockRepository.upsertJobMatch.mockResolvedValue({
        ...existingStaleMatch,
        profileVersion: 2,
        overallScore: 0.95,
      });

      const matchMap = await service.ensureJobMatches(workspaceId, [
        sampleJobA,
      ]);

      // Should have recomputed and upserted with version 2
      expect(mockRepository.upsertJobMatch).toHaveBeenCalledWith(
        'job-a',
        workspaceId,
        expect.any(Object),
        undefined,
        2,
      );
      expect(matchMap.get('job-a')?.profileVersion).toBe(2);
    });
  });

  describe('Workspace Job State Actions', () => {
    it('saves a job successfully', async () => {
      mockRepository.findJobById.mockResolvedValue(sampleJobA);
      mockRepository.upsertWorkspaceJobState.mockResolvedValue({
        id: 'state-1',
        workspaceId,
        jobId: sampleJobA.id,
        status: 'saved',
        isSaved: true,
        isDismissed: false,
        createdAt: '2026-08-18T00:00:00.000Z',
        updatedAt: '2026-08-18T00:00:00.000Z',
      });
      mockRepository.findJobMatch.mockResolvedValue(null);
      mockRepository.findWorkspaceJobState.mockResolvedValue({
        id: 'state-1',
        workspaceId,
        jobId: sampleJobA.id,
        status: 'saved',
        isSaved: true,
        isDismissed: false,
        createdAt: '2026-08-18T00:00:00.000Z',
        updatedAt: '2026-08-18T00:00:00.000Z',
      });

      const opp = await service.saveJob(workspaceId, sampleJobA.id);

      expect(mockRepository.upsertWorkspaceJobState).toHaveBeenCalledWith(
        workspaceId,
        sampleJobA.id,
        { isSaved: true, status: 'saved' },
      );
      expect(opp.workspaceState?.isSaved).toBe(true);
    });

    it('dismisses and restores a job successfully', async () => {
      mockRepository.findJobById.mockResolvedValue(sampleJobA);
      mockRepository.upsertWorkspaceJobState.mockResolvedValue({
        id: 'state-1',
        workspaceId,
        jobId: sampleJobA.id,
        status: 'dismissed',
        isSaved: false,
        isDismissed: true,
        createdAt: '2026-08-18T00:00:00.000Z',
        updatedAt: '2026-08-18T00:00:00.000Z',
      });
      mockRepository.findJobMatch.mockResolvedValue(null);
      mockRepository.findWorkspaceJobState.mockResolvedValue({
        id: 'state-1',
        workspaceId,
        jobId: sampleJobA.id,
        status: 'dismissed',
        isSaved: false,
        isDismissed: true,
        createdAt: '2026-08-18T00:00:00.000Z',
        updatedAt: '2026-08-18T00:00:00.000Z',
      });

      const dismissed = await service.dismissJob(workspaceId, sampleJobA.id);
      expect(dismissed.workspaceState?.isDismissed).toBe(true);

      mockRepository.findWorkspaceJobState.mockResolvedValue({
        id: 'state-1',
        workspaceId,
        jobId: sampleJobA.id,
        status: 'discovered',
        isSaved: false,
        isDismissed: false,
        createdAt: '2026-08-18T00:00:00.000Z',
        updatedAt: '2026-08-18T00:00:00.000Z',
      });

      const restored = await service.restoreJob(workspaceId, sampleJobA.id);
      expect(restored.workspaceState?.isDismissed).toBe(false);
    });

    it('updates job notes and status', async () => {
      mockRepository.findJobById.mockResolvedValue(sampleJobA);
      mockRepository.findJobMatch.mockResolvedValue(null);
      mockRepository.findWorkspaceJobState.mockResolvedValue({
        id: 'state-1',
        workspaceId,
        jobId: sampleJobA.id,
        status: 'saved',
        isSaved: true,
        isDismissed: false,
        notes: 'Followed up with recruiter on LinkedIn',
        createdAt: '2026-08-18T00:00:00.000Z',
        updatedAt: '2026-08-18T00:00:00.000Z',
      });

      const updated = await service.updateJobState(workspaceId, sampleJobA.id, {
        status: 'saved',
        notes: 'Followed up with recruiter on LinkedIn',
      });

      expect(mockRepository.upsertWorkspaceJobState).toHaveBeenCalledWith(
        workspaceId,
        sampleJobA.id,
        {
          status: 'saved',
          isSaved: undefined,
          notes: 'Followed up with recruiter on LinkedIn',
        },
      );
      expect(updated.workspaceState?.notes).toBe(
        'Followed up with recruiter on LinkedIn',
      );
      expect(updated.workspaceState?.status).toBe('saved');
    });

    it('unsaving clears isSaved (previously ignored)', async () => {
      mockRepository.findJobById.mockResolvedValue(sampleJobA);
      mockRepository.findJobMatch.mockResolvedValue(null);
      mockRepository.findWorkspaceJobState.mockResolvedValue(null);

      await service.updateJobState(workspaceId, sampleJobA.id, {
        isSaved: false,
        status: 'discovered',
      });

      expect(mockRepository.upsertWorkspaceJobState).toHaveBeenCalledWith(
        workspaceId,
        sampleJobA.id,
        { status: 'discovered', isSaved: false, notes: undefined },
      );
    });

    it.each(['interview', 'offer', 'rejected'] as const)(
      'rejects application-owned stage %p on job state',
      async (status) => {
        mockRepository.findJobById.mockResolvedValue(sampleJobA);
        await expect(
          service.updateJobState(workspaceId, sampleJobA.id, { status }),
        ).rejects.toThrow(BadRequestException);
        expect(mockRepository.upsertWorkspaceJobState).not.toHaveBeenCalled();
      },
    );

    it('never downgrades an applied job when saving, dismissing, or setting status', async () => {
      mockRepository.findJobById.mockResolvedValue(sampleJobA);
      mockRepository.findJobMatch.mockResolvedValue(null);
      mockRepository.findWorkspaceJobState.mockResolvedValue(null);
      mockApplicationsService.hasAppliedToJob.mockResolvedValue(true);

      await service.saveJob(workspaceId, sampleJobA.id);
      await service.dismissJob(workspaceId, sampleJobA.id);
      await service.updateJobState(workspaceId, sampleJobA.id, {
        isSaved: false,
        status: 'discovered',
      });

      const calls = mockRepository.upsertWorkspaceJobState.mock.calls as [
        string,
        string,
        { status?: string },
      ][];
      const statuses = calls.map((call) => call[2].status);
      expect(statuses).toEqual(['applied', 'applied', 'applied']);
    });

    it('status "applied" via job state creates/advances the Application', async () => {
      mockRepository.findJobById.mockResolvedValue(sampleJobA);
      mockRepository.findJobMatch.mockResolvedValue(null);
      mockRepository.findWorkspaceJobState.mockResolvedValue(null);

      await service.updateJobState(workspaceId, sampleJobA.id, {
        status: 'applied',
        appliedAt: '2026-09-01T00:00:00.000Z',
      });

      expect(mockApplicationsService.markApplied).toHaveBeenCalledWith(
        workspaceId,
        sampleJobA.id,
        { appliedAt: new Date('2026-09-01T00:00:00.000Z') },
      );
      expect(mockRepository.upsertWorkspaceJobState).not.toHaveBeenCalled();
    });

    it('applyToJob delegates to the Application CRM with the resume profile', async () => {
      mockRepository.findJobById.mockResolvedValue(sampleJobA);
      mockRepository.findJobMatch.mockResolvedValue(null);
      mockRepository.findWorkspaceJobState.mockResolvedValue(null);

      await service.applyToJob(workspaceId, sampleJobA.id, {
        resumeProfileId: 'rp-1',
        notes: 'Referred by Sam',
      });

      expect(mockApplicationsService.markApplied).toHaveBeenCalledWith(
        workspaceId,
        sampleJobA.id,
        { resumeProfileId: 'rp-1', notes: 'Referred by Sam' },
      );
    });

    it('throws NotFoundException when interacting with nonexistent job', async () => {
      mockRepository.findJobById.mockResolvedValue(null);

      await expect(service.saveJob(workspaceId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createTargetedResumeVersion', () => {
    it('creates an immutable targeted ResumeVersion grounded on MasterCareerProfile matches', async () => {
      mockRepository.findJobById.mockResolvedValue(sampleJobA);
      mockCareerProfileService.findByWorkspace.mockResolvedValue(
        sampleMasterProfile,
      );
      mockResumeProfileService.listByWorkspace.mockResolvedValue([
        {
          id: 'rp-1',
          workspaceId,
          name: 'General Software Profile',
          visibleSections: ['identity', 'skills', 'experience', 'projects'],
          sectionOrder: ['identity', 'skills', 'experience', 'projects'],
          highlightRules: [],
          priorityProjectIds: [],
          prioritySkillIds: [],
          priorityExperienceIds: [],
          priorityAchievementIds: [],
          priorityCertificationIds: [],
          styleSettings: {},
          createdAt: '2026-08-18T00:00:00.000Z',
          updatedAt: '2026-08-18T00:00:00.000Z',
        },
      ]);

      mockResumeProfileService.createVersion.mockImplementation(
        async (
          wsId: string,
          rpId: string,
          input: {
            targetCompany?: string;
            targetRole?: string;
            outputFormat?: 'html' | 'latex' | 'pdf';
            selectedRecordIds: {
              skillIds: string[];
              projectIds: string[];
              experienceIds: string[];
              achievementIds: string[];
              certificationIds: string[];
            };
            jobAnalysisEvidence?: Record<string, unknown>;
            matchResult?: Record<string, unknown>;
            confidence?: number;
            explanation?: string;
            artifactMetadata?: Record<string, unknown>;
          },
        ) => {
          return Promise.resolve({
            id: 'ver-123',
            workspaceId: wsId,
            resumeProfileId: rpId,
            targetCompany: input.targetCompany,
            targetRole: input.targetRole,
            outputFormat: input.outputFormat ?? 'html',
            selectedRecordIds: input.selectedRecordIds,
            masterProfileSnapshot: sampleMasterProfile,
            jobAnalysisEvidence: input.jobAnalysisEvidence,
            matchResult: input.matchResult,
            confidence: input.confidence,
            explanation: input.explanation,
            artifactMetadata: input.artifactMetadata,
            createdAt: '2026-08-18T00:00:00.000Z',
          });
        },
      );

      const result = await service.createTargetedResumeVersion(
        sampleJobA.id,
        workspaceId,
      );

      expect(result.version).toBeDefined();
      expect(result.version.targetCompany).toBe('Stripe');
      expect(result.version.targetRole).toBe('Senior TypeScript Engineer');
      expect(result.version.selectedRecordIds.skillIds).toContain('sk-1'); // TypeScript skill selected
      expect(result.analysis).toBeDefined();
      expect(result.analysis.jobId).toBe('job-a');
    });

    it('rejects a supplied resume profile that does not exist in the workspace instead of substituting another', async () => {
      mockRepository.findJobById.mockResolvedValue(sampleJobA);
      mockCareerProfileService.findByWorkspace.mockResolvedValue(
        sampleMasterProfile,
      );
      mockResumeProfileService.findById.mockResolvedValue(undefined);
      mockResumeProfileService.listByWorkspace.mockResolvedValue([
        { id: 'rp-other', name: 'Other' },
      ]);

      await expect(
        service.createTargetedResumeVersion(
          sampleJobA.id,
          workspaceId,
          'rp-missing',
        ),
      ).rejects.toThrow(NotFoundException);
      expect(mockResumeProfileService.createVersion).not.toHaveBeenCalled();
    });
  });

  // ── P1: Job Detail contract ─────────────────────────────────────────────
  describe('getJobDetail', () => {
    const storedMatch = (overrides: Partial<StoredJobMatch> = {}) =>
      ({
        id: 'm-1',
        jobId: sampleJobA.id,
        workspaceId,
        resumeProfileId: undefined,
        overallScore: 0.8,
        skillScore: 0.9,
        roleScore: 0.7,
        experienceScore: 0.6,
        locationScore: 1,
        seniorityScore: 0.75,
        matchedSkills: ['typescript'],
        missingSkills: [],
        confidence: 0.9,
        explanation: 'Generic match',
        evidence: null,
        profileVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
      }) as StoredJobMatch;

    it('returns the enriched JobOpportunity (job + workspace match + state)', async () => {
      mockRepository.findJobById.mockResolvedValue(sampleJobA);
      mockCareerProfileService.findByWorkspace.mockResolvedValue(
        sampleMasterProfile,
      );
      mockRepository.listJobMatchesForWorkspace.mockResolvedValue([
        storedMatch(),
      ]);
      mockRepository.findJobMatch.mockResolvedValue(storedMatch());
      mockRepository.findWorkspaceJobState.mockResolvedValue({
        status: 'saved',
        isSaved: true,
        isDismissed: false,
        notes: 'Call recruiter',
      });

      const detail = await service.getJobDetail(workspaceId, sampleJobA.id);

      expect(detail.id).toBe(sampleJobA.id);
      expect(detail.company).toBe('Stripe');
      expect(detail.matchScore).toBe(80);
      expect(detail.match?.explanation).toBe('Generic match');
      expect(detail.workspaceState).toEqual(
        expect.objectContaining({ isSaved: true, notes: 'Call recruiter' }),
      );
      // Match lookups are workspace-scoped.
      expect(mockRepository.findJobMatch).toHaveBeenCalledWith(
        sampleJobA.id,
        workspaceId,
        undefined,
      );
      expect(mockRepository.findWorkspaceJobState).toHaveBeenCalledWith(
        workspaceId,
        sampleJobA.id,
      );
      // Fresh match already stored → nothing recomputed.
      expect(mockRepository.upsertJobMatch).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown job', async () => {
      mockRepository.findJobById.mockResolvedValue(null);
      await expect(
        service.getJobDetail(workspaceId, 'no-such-job'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── P2: Profile-specific matching ───────────────────────────────────────
  describe('computeAndPersistMatch with resumeProfileId', () => {
    const resumeProfileA = {
      id: 'rp-a',
      workspaceId,
      name: 'SDE Resume',
      roleFocus: 'TypeScript Engineer',
      visibleSections: [],
      sectionOrder: [],
      highlightRules: [],
      priorityProjectIds: [],
      prioritySkillIds: [],
      priorityExperienceIds: [],
      priorityAchievementIds: [],
      priorityCertificationIds: [],
      styleSettings: {},
      createdAt: '2026-08-18T00:00:00.000Z',
      updatedAt: '2026-08-18T00:00:00.000Z',
    };

    beforeEach(() => {
      mockRepository.findJobById.mockResolvedValue(sampleJobA);
      mockCareerProfileService.findByWorkspace.mockResolvedValue(
        sampleMasterProfile,
      );
      mockRepository.findWorkspaceJobState.mockResolvedValue(null);
    });

    it('persists and returns the match for exactly that resume profile', async () => {
      mockResumeProfileService.findById.mockResolvedValue(resumeProfileA);
      mockRepository.upsertJobMatch.mockResolvedValue({});
      mockRepository.findJobMatch.mockImplementation(
        (_jobId: string, _ws: string, rpId?: string) =>
          Promise.resolve(
            rpId === 'rp-a'
              ? {
                  id: 'm-a',
                  jobId: sampleJobA.id,
                  workspaceId,
                  resumeProfileId: 'rp-a',
                  overallScore: 0.91,
                  skillScore: 1,
                  roleScore: 0.8,
                  experienceScore: 0.6,
                  locationScore: 1,
                  seniorityScore: 0.75,
                  matchedSkills: ['typescript'],
                  missingSkills: [],
                  confidence: 1,
                  explanation: 'Profile A match',
                  evidence: null,
                  profileVersion: 1,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }
              : {
                  id: 'm-generic',
                  jobId: sampleJobA.id,
                  workspaceId,
                  resumeProfileId: undefined,
                  overallScore: 0.2,
                  skillScore: 0.2,
                  roleScore: 0.2,
                  experienceScore: 0.2,
                  locationScore: 0.2,
                  seniorityScore: 0.2,
                  matchedSkills: [],
                  missingSkills: [],
                  confidence: 1,
                  explanation: 'Generic match',
                  evidence: null,
                  profileVersion: 1,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
          ),
      );

      const result = await service.computeAndPersistMatch(
        sampleJobA.id,
        workspaceId,
        'rp-a',
      );

      expect(mockRepository.upsertJobMatch).toHaveBeenCalledWith(
        sampleJobA.id,
        workspaceId,
        expect.any(Object),
        'rp-a',
        sampleMasterProfile.version,
      );
      expect(mockRepository.findJobMatch).toHaveBeenCalledWith(
        sampleJobA.id,
        workspaceId,
        'rp-a',
      );
      expect(result.match?.explanation).toBe('Profile A match');
      expect(result.match?.resumeProfileId).toBe('rp-a');
      expect(result.matchScore).toBe(91);
    });

    it('404s for a resume profile outside the workspace and persists nothing', async () => {
      mockResumeProfileService.findById.mockResolvedValue(undefined);

      await expect(
        service.computeAndPersistMatch(
          sampleJobA.id,
          workspaceId,
          'rp-foreign',
        ),
      ).rejects.toThrow(NotFoundException);
      expect(mockRepository.upsertJobMatch).not.toHaveBeenCalled();
    });

    it('without resumeProfileId, returns the profile-agnostic match', async () => {
      mockRepository.upsertJobMatch.mockResolvedValue({});
      mockRepository.findJobMatch.mockResolvedValue(null);

      await service.computeAndPersistMatch(sampleJobA.id, workspaceId);

      expect(mockRepository.upsertJobMatch).toHaveBeenCalledWith(
        sampleJobA.id,
        workspaceId,
        expect.any(Object),
        undefined,
        sampleMasterProfile.version,
      );
      expect(mockRepository.findJobMatch).toHaveBeenCalledWith(
        sampleJobA.id,
        workspaceId,
        undefined,
      );
    });
  });
});
