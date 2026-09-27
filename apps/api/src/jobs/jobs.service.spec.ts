import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { CanonicalJob, WorkspaceJobState } from '@repo/types';

import type { ApplicationsService } from '../applications/applications.service';
import type { CareerProfileService } from '../career-profile/career-profile.service';
import type { MasterCareerProfile } from '../career-profile/career-profile.types';
import type { ResumeProfileService } from '../resume-profile/resume-profile.service';
import type { ResumeProfile } from '../resume-profile/resume-profile.types';
import type { JobIngestionService } from './ingestion/job-ingestion.service';
import { JobAnalysisService } from './job-analysis.service';
import { JobMatchingService } from './job-matching.service';
import { JobsService } from './jobs.service';
import type {
  GenericMatchSourceRow,
  JobRankingKey,
  ListJobsQuery,
  MatchOutput,
  StoredJobMatch,
} from './jobs.types';
import { MATCHER_VERSION, type MatchSource } from './match-freshness';
import type { PrismaJobsRepository } from './prisma-jobs.repository';

/**
 * In-memory stand-in for PrismaJobsRepository with the same contract, so the
 * service's real listing / ranking / freshness / state logic runs end to end.
 * (The Prisma query translation of the filters is covered by
 * job-radar.db.spec.ts against PostgreSQL.)
 */
class FakeJobsRepository {
  jobs = new Map<string, CanonicalJob>();
  matches: StoredJobMatch[] = [];
  states = new Map<string, WorkspaceJobState>();
  replaceCalls: string[][] = [];

  addJob(job: CanonicalJob) {
    this.jobs.set(job.id, job);
  }

  listCandidateJobs(
    ws: string,
    q: ListJobsQuery = {},
  ): Promise<JobRankingKey[]> {
    const rows = [...this.jobs.values()].filter((j) => {
      const state = this.states.get(`${ws}:${j.id}`);
      if (q.remoteOnly && !j.isRemote) return false;
      if (
        q.skill &&
        ![...j.requiredSkills, ...j.preferredSkills].includes(q.skill)
      )
        return false;
      if (
        q.query &&
        !`${j.title} ${j.company}`.toLowerCase().includes(q.query.toLowerCase())
      )
        return false;
      if (q.savedOnly && !state?.isSaved) return false;
      if (q.hideDismissed && state?.isDismissed) return false;
      return true;
    });
    return Promise.resolve(
      rows.map((j) => ({
        id: j.id,
        postedAt: j.postedAt ? new Date(j.postedAt) : null,
        createdAt: new Date(j.createdAt),
        updatedAt: new Date(j.updatedAt),
      })),
    );
  }

  findJobsByIds(ids: string[]) {
    return Promise.resolve(ids.flatMap((id) => this.jobs.get(id) ?? []));
  }

  findJobById(id: string) {
    return Promise.resolve(this.jobs.get(id) ?? null);
  }

  listGenericMatchSources(ws: string): Promise<GenericMatchSourceRow[]> {
    return Promise.resolve(
      this.matches
        .filter((m) => m.workspaceId === ws && !m.resumeProfileId)
        .map((m) => ({
          jobId: m.jobId,
          overallScore: m.overallScore,
          matcherVersion: m.matcherVersion ?? null,
          profileVersion: m.profileVersion ?? null,
          jobUpdatedAt: m.jobUpdatedAt ?? null,
          resumeProfileUpdatedAt: m.resumeProfileUpdatedAt ?? null,
          weightsKey: m.weightsKey ?? null,
        })),
    );
  }

  findGenericMatchesForJobs(ws: string, ids: string[]) {
    return Promise.resolve(
      new Map(
        this.matches
          .filter(
            (m) =>
              m.workspaceId === ws &&
              !m.resumeProfileId &&
              ids.includes(m.jobId),
          )
          .map((m) => [m.jobId, m]),
      ),
    );
  }

  private toStored(
    ws: string,
    jobId: string,
    output: MatchOutput,
    source: MatchSource & { resumeProfileId?: string },
  ): StoredJobMatch {
    return {
      id: `m-${ws}-${jobId}-${source.resumeProfileId ?? 'generic'}`,
      jobId,
      workspaceId: ws,
      resumeProfileId: source.resumeProfileId,
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
      profileVersion: source.profileVersion,
      matcherVersion: source.matcherVersion,
      jobUpdatedAt: source.jobUpdatedAt,
      resumeProfileUpdatedAt: source.resumeProfileUpdatedAt,
      weightsKey: source.weightsKey,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  replaceGenericMatches(
    ws: string,
    entries: { jobId: string; output: MatchOutput; source: MatchSource }[],
  ) {
    this.replaceCalls.push(entries.map((e) => e.jobId));
    const ids = new Set(entries.map((e) => e.jobId));
    this.matches = this.matches.filter(
      (m) => !(m.workspaceId === ws && !m.resumeProfileId && ids.has(m.jobId)),
    );
    for (const e of entries)
      this.matches.push(this.toStored(ws, e.jobId, e.output, e.source));
    return Promise.resolve();
  }

  upsertJobMatch(
    jobId: string,
    ws: string,
    output: MatchOutput,
    source: MatchSource & { resumeProfileId?: string },
  ) {
    const rp = source.resumeProfileId;
    this.matches = this.matches.filter(
      (m) =>
        !(
          m.workspaceId === ws &&
          m.jobId === jobId &&
          m.resumeProfileId === rp
        ),
    );
    const stored = this.toStored(ws, jobId, output, source);
    this.matches.push(stored);
    return Promise.resolve(stored);
  }

  findJobMatch(jobId: string, ws: string, rp?: string) {
    return Promise.resolve(
      this.matches.find(
        (m) =>
          m.workspaceId === ws && m.jobId === jobId && m.resumeProfileId === rp,
      ) ?? null,
    );
  }

  findWorkspaceJobState(ws: string, jobId: string) {
    return Promise.resolve(this.states.get(`${ws}:${jobId}`) ?? null);
  }

  findWorkspaceStatesForJobs(ws: string, ids: string[]) {
    return Promise.resolve(
      new Map(
        ids.flatMap((id) => {
          const s = this.states.get(`${ws}:${id}`);
          return s ? [[id, s] as const] : [];
        }),
      ),
    );
  }

  upsertWorkspaceJobState(
    ws: string,
    jobId: string,
    data: Omit<Partial<WorkspaceJobState>, 'appliedAt'> & {
      appliedAt?: Date | null;
    },
  ) {
    const key = `${ws}:${jobId}`;
    const prev = this.states.get(key);
    const next: WorkspaceJobState = {
      id: prev?.id ?? `s-${key}`,
      workspaceId: ws,
      jobId,
      status: data.status ?? prev?.status ?? 'discovered',
      isSaved: data.isSaved ?? prev?.isSaved ?? false,
      isDismissed: data.isDismissed ?? prev?.isDismissed ?? false,
      notes: data.notes ?? prev?.notes,
      appliedAt:
        data.appliedAt === undefined
          ? prev?.appliedAt
          : (data.appliedAt?.toISOString() ?? undefined),
      createdAt: prev?.createdAt ?? '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    this.states.set(key, next);
    return Promise.resolve(next);
  }
}

const WS = 'ws-1';
const OTHER_WS = 'ws-2';

const master = (version = 1): MasterCareerProfile => ({
  id: 'prof-1',
  workspaceId: WS,
  version,
  createdAt: '2026-08-18T00:00:00.000Z',
  updatedAt: '2026-08-18T00:00:00.000Z',
  identity: { fullName: 'Jane Developer', location: 'Remote' },
  skills: [
    { id: 'sk-1', name: 'TypeScript' },
    { id: 'sk-2', name: 'React' },
    { id: 'sk-3', name: 'Node.js' },
  ],
  technologies: [],
  experiences: [
    {
      id: 'exp-1',
      company: 'Acme',
      title: 'Software Engineer',
      startDate: '2021-01',
      endDate: '2024-01',
      technologies: ['TypeScript'],
    },
  ],
  projects: [
    { id: 'proj-1', name: 'SaaS', technologies: ['TypeScript', 'Node.js'] },
  ],
  education: [],
  achievements: [],
  publications: [],
  hackathons: [],
  certifications: [],
  links: [],
});

let seq = 0;
const job = (overrides: Partial<CanonicalJob> = {}): CanonicalJob => {
  seq += 1;
  const n = String(seq).padStart(4, '0');
  return {
    id: `00000000-0000-4000-8000-00000000${n}`,
    source: 'manual',
    company: `Co ${n}`,
    title: 'Software Engineer',
    location: 'Remote',
    isRemote: true,
    requiredSkills: ['COBOL', 'Fortran'],
    preferredSkills: [],
    isNormalized: true,
    postedAt: '2026-08-01T00:00:00.000Z',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
};

const resumeProfile = (
  overrides: Partial<ResumeProfile> = {},
): ResumeProfile => ({
  id: 'rp-a',
  workspaceId: WS,
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
  ...overrides,
});

describe('JobsService', () => {
  let repo: FakeJobsRepository;
  let service: JobsService;
  let masterProfile: MasterCareerProfile | undefined;
  let careerProfileService: { findByWorkspace: jest.Mock };
  let resumeProfileService: {
    findById: jest.Mock;
    listByWorkspace: jest.Mock;
    create: jest.Mock;
    createVersion: jest.Mock;
  };
  let applicationsService: {
    getAppliedMirror: jest.Mock;
    markApplied: jest.Mock;
  };

  beforeEach(() => {
    seq = 0;
    repo = new FakeJobsRepository();
    masterProfile = master();
    careerProfileService = {
      findByWorkspace: jest.fn(() => Promise.resolve(masterProfile)),
    };
    resumeProfileService = {
      findById: jest.fn(),
      listByWorkspace: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      createVersion: jest.fn(),
    };
    applicationsService = {
      getAppliedMirror: jest.fn().mockResolvedValue(null),
      markApplied: jest.fn(),
    };
    service = new JobsService(
      repo as unknown as PrismaJobsRepository,
      new JobMatchingService(),
      new JobAnalysisService(),
      careerProfileService as unknown as CareerProfileService,
      resumeProfileService as unknown as ResumeProfileService,
      {} as JobIngestionService,
      applicationsService as unknown as ApplicationsService,
    );
  });

  // ── Area 6: ranking, pagination, filtering ───────────────────────────────
  describe('Job Radar ranking and pagination', () => {
    it('a strong match that is oldest by date outranks 55 newer non-matches (ranked before paging)', async () => {
      for (let i = 0; i < 55; i++) {
        repo.addJob(
          job({
            postedAt: `2026-09-${String(10 + (i % 18)).padStart(2, '0')}T00:00:00.000Z`,
          }),
        );
      }
      const strong = job({
        title: 'TypeScript Engineer',
        requiredSkills: ['TypeScript', 'React'],
        postedAt: '2025-01-01T00:00:00.000Z',
      });
      repo.addJob(strong);

      const page1 = await service.listByWorkspace(WS, { limit: 50, offset: 0 });

      expect(page1).toHaveLength(50);
      expect(page1[0]?.id).toBe(strong.id);
      // Fit was computed for the whole candidate set, not just one page.
      expect(repo.matches.filter((m) => m.workspaceId === WS)).toHaveLength(56);
    });

    it('pages partition the single global ranking (no gaps, no duplicates)', async () => {
      for (let i = 0; i < 23; i++) {
        repo.addJob(
          job({
            requiredSkills: i % 3 === 0 ? ['TypeScript'] : ['COBOL'],
            postedAt:
              i % 4 === 0
                ? undefined
                : `2026-08-${String(1 + i).padStart(2, '0')}T00:00:00.000Z`,
          }),
        );
      }
      const all = await service.listByWorkspace(WS, { limit: 100 });
      const paged = [
        ...(await service.listByWorkspace(WS, { limit: 10, offset: 0 })),
        ...(await service.listByWorkspace(WS, { limit: 10, offset: 10 })),
        ...(await service.listByWorkspace(WS, { limit: 10, offset: 20 })),
      ];
      expect(paged.map((j) => j.id)).toEqual(all.map((j) => j.id));
      expect(new Set(paged.map((j) => j.id)).size).toBe(23);
    });

    it('ties are broken by postedAt desc, NULL postedAt last, then createdAt desc, then id', async () => {
      const a = job({ postedAt: '2026-08-02T00:00:00.000Z' });
      const nullOld = job({
        postedAt: undefined,
        createdAt: '2026-01-01T00:00:00.000Z',
      });
      const b = job({ postedAt: '2026-08-05T00:00:00.000Z' });
      const nullNew = job({
        postedAt: undefined,
        createdAt: '2026-06-01T00:00:00.000Z',
      });
      const sameA = job({ postedAt: '2026-08-02T00:00:00.000Z' }); // same score + date as a → id decides
      // Insert in scrambled order; output must not depend on it.
      for (const j of [nullOld, sameA, b, nullNew, a]) repo.addJob(j);

      const first = (await service.listByWorkspace(WS)).map((j) => j.id);
      repo.jobs = new Map([...repo.jobs.entries()].reverse());
      const second = (await service.listByWorkspace(WS)).map((j) => j.id);

      expect(first).toEqual([b.id, a.id, sameA.id, nullNew.id, nullOld.id]);
      expect(second).toEqual(first);
    });

    it('filters are applied to the whole catalog: a saved job ranked beyond page 1 is returned', async () => {
      for (let i = 0; i < 70; i++)
        repo.addJob(
          job({ requiredSkills: i < 60 ? ['TypeScript'] : ['COBOL'] }),
        );
      const lowRanked = [...repo.jobs.values()][65];
      await service.saveJob(WS, lowRanked.id);

      const saved = await service.listByWorkspace(WS, { savedOnly: true });
      expect(saved.map((j) => j.id)).toEqual([lowRanked.id]);

      await service.dismissJob(WS, [...repo.jobs.values()][0].id);
      const visible = await service.listByWorkspace(WS, {
        hideDismissed: true,
        limit: 100,
      });
      expect(visible).toHaveLength(69);
    });

    it('without a master profile no scores are shown and nothing is persisted', async () => {
      masterProfile = undefined;
      repo.addJob(job());
      const list = await service.listByWorkspace(WS);
      expect(list[0]?.match).toBeUndefined();
      expect(repo.matches).toHaveLength(0);
    });
  });

  // ── Area 3: JobMatch freshness ───────────────────────────────────────────
  describe('match freshness', () => {
    it('computes and records the exact inputs for a new workspace', async () => {
      const j = job();
      repo.addJob(j);
      await service.listByWorkspace(WS);
      const stored = repo.matches[0];
      expect(stored.matcherVersion).toBe(MATCHER_VERSION);
      expect(stored.profileVersion).toBe(1);
      expect(stored.jobUpdatedAt?.toISOString()).toBe(j.updatedAt);
      expect(stored.weightsKey).toBe('default');
    });

    it('reuses fresh matches and recomputes when the master profile version changes', async () => {
      repo.addJob(job());
      await service.listByWorkspace(WS);
      await service.listByWorkspace(WS);
      expect(repo.replaceCalls).toHaveLength(1);

      masterProfile = master(2);
      await service.listByWorkspace(WS);
      expect(repo.replaceCalls).toHaveLength(2);
      expect(repo.matches[0]?.profileVersion).toBe(2);
    });

    it('recomputes only the job whose data changed (re-ingestion)', async () => {
      const a = job();
      const b = job();
      repo.addJob(a);
      repo.addJob(b);
      await service.listByWorkspace(WS);
      repo.addJob({
        ...b,
        requiredSkills: ['TypeScript'],
        updatedAt: '2026-09-01T00:00:00.000Z',
      });

      const list = await service.listByWorkspace(WS);
      expect(repo.replaceCalls.at(-1)).toEqual([b.id]);
      expect(list.find((j) => j.id === b.id)?.match?.matchedSkills).toEqual([
        'typescript',
      ]);
    });

    it.each([
      ['missing profile version (legacy)', { profileVersion: null }],
      ['missing matcher version (legacy)', { matcherVersion: null }],
      ['older matcher version', { matcherVersion: MATCHER_VERSION - 1 }],
      ['custom weights', { weightsKey: '[["skill",1]]' }],
    ])('treats a stored match with %s as stale', async (_label, patch) => {
      const j = job({ requiredSkills: ['TypeScript'] });
      repo.addJob(j);
      await service.listByWorkspace(WS);
      Object.assign(repo.matches[0], patch, { overallScore: 0.01 });

      const list = await service.listByWorkspace(WS);
      expect(repo.replaceCalls).toHaveLength(2);
      expect(list[0]?.match?.overallScore).not.toBe(0.01);
    });

    it("never uses another workspace's matches", async () => {
      const j = job();
      repo.addJob(j);
      repo.matches.push({
        ...(await (async () => {
          await service.listByWorkspace(WS);
          return repo.matches[0];
        })()),
        workspaceId: OTHER_WS,
        overallScore: 0.99,
      });
      repo.matches = repo.matches.filter((m) => m.workspaceId === OTHER_WS);

      const list = await service.listByWorkspace(WS);
      expect(list[0]?.match?.overallScore).not.toBe(0.99);
      expect(repo.matches.filter((m) => m.workspaceId === WS)).toHaveLength(1);
    });

    it('profile-specific matches are separate per resume profile and record the profile state', async () => {
      const j = job({ requiredSkills: ['TypeScript'] });
      repo.addJob(j);
      const rpA = resumeProfile({
        id: 'rp-a',
        updatedAt: '2026-09-01T00:00:00.000Z',
      });
      const rpB = resumeProfile({
        id: 'rp-b',
        roleFocus: 'Nurse',
        updatedAt: '2026-09-02T00:00:00.000Z',
      });
      resumeProfileService.findById.mockImplementation(
        (_ws: string, id: string) =>
          Promise.resolve(
            id === 'rp-a' ? rpA : id === 'rp-b' ? rpB : undefined,
          ),
      );

      const a = await service.computeAndPersistMatch(j.id, WS, 'rp-a');
      const b = await service.computeAndPersistMatch(j.id, WS, 'rp-b');
      await service.listByWorkspace(WS);

      expect(a.match?.resumeProfileId).toBe('rp-a');
      expect(b.match?.resumeProfileId).toBe('rp-b');
      const rows = repo.matches.filter((m) => m.jobId === j.id);
      expect(rows.map((m) => m.resumeProfileId ?? 'generic').sort()).toEqual([
        'generic',
        'rp-a',
        'rp-b',
      ]);
      expect(
        rows
          .find((m) => m.resumeProfileId === 'rp-a')
          ?.resumeProfileUpdatedAt?.toISOString(),
      ).toBe(rpA.updatedAt);
    });

    it('404s for a resume profile outside the workspace and persists nothing', async () => {
      const j = job();
      repo.addJob(j);
      resumeProfileService.findById.mockResolvedValue(undefined);
      await expect(
        service.computeAndPersistMatch(j.id, WS, 'rp-foreign'),
      ).rejects.toThrow(NotFoundException);
      expect(repo.matches).toHaveLength(0);
    });
  });

  // ── Area 1: Job Radar state invariant ────────────────────────────────────
  describe('Job Radar state', () => {
    it('save / dismiss / restore / unsave derive status from the flags', async () => {
      const j = job();
      repo.addJob(j);
      expect((await service.saveJob(WS, j.id)).workspaceState?.status).toBe(
        'saved',
      );
      const dismissed = await service.dismissJob(WS, j.id);
      expect(dismissed.workspaceState).toMatchObject({
        status: 'dismissed',
        isSaved: true,
        isDismissed: true,
      });
      expect((await service.restoreJob(WS, j.id)).workspaceState?.status).toBe(
        'saved',
      );
      const unsaved = await service.updateJobState(WS, j.id, {
        isSaved: false,
      });
      expect(unsaved.workspaceState).toMatchObject({
        status: 'discovered',
        isSaved: false,
      });
    });

    it('an applied Application always wins and its appliedAt is mirrored', async () => {
      const j = job();
      repo.addJob(j);
      applicationsService.getAppliedMirror.mockResolvedValue({
        appliedAt: new Date('2026-09-01T00:00:00.000Z'),
      });
      await service.saveJob(WS, j.id);
      await service.dismissJob(WS, j.id);
      const state = (
        await service.updateJobState(WS, j.id, {
          isSaved: false,
          status: 'discovered',
        })
      ).workspaceState;
      expect(state).toMatchObject({
        status: 'applied',
        isSaved: false,
        isDismissed: false,
        appliedAt: '2026-09-01T00:00:00.000Z',
      });
    });

    it('maps the legacy status field onto flags; explicit flags take precedence', async () => {
      const j = job();
      repo.addJob(j);
      await service.updateJobState(WS, j.id, { status: 'dismissed' });
      expect(repo.states.get(`${WS}:${j.id}`)).toMatchObject({
        isDismissed: true,
        status: 'dismissed',
      });
      await service.updateJobState(WS, j.id, {
        status: 'saved',
        isDismissed: false,
      });
      expect(repo.states.get(`${WS}:${j.id}`)).toMatchObject({
        isSaved: true,
        isDismissed: false,
        status: 'saved',
      });
      await service.updateJobState(WS, j.id, { notes: 'call back' });
      expect(repo.states.get(`${WS}:${j.id}`)).toMatchObject({
        notes: 'call back',
        status: 'saved',
      });
    });

    it.each(['interview', 'offer', 'rejected', 'nonsense'])(
      'rejects status %p on job state',
      async (status) => {
        const j = job();
        repo.addJob(j);
        await expect(
          service.updateJobState(WS, j.id, { status }),
        ).rejects.toThrow(BadRequestException);
        expect(repo.states.size).toBe(0);
      },
    );

    it('status "applied" goes through the Application CRM', async () => {
      const j = job();
      repo.addJob(j);
      await service.updateJobState(WS, j.id, {
        status: 'applied',
        appliedAt: '2026-09-01T00:00:00.000Z',
      });
      expect(applicationsService.markApplied).toHaveBeenCalledWith(WS, j.id, {
        appliedAt: new Date('2026-09-01T00:00:00.000Z'),
      });
    });

    it('rejects appliedAt without status "applied"', async () => {
      const j = job();
      repo.addJob(j);
      await expect(
        service.updateJobState(WS, j.id, { appliedAt: '2026-09-01' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('applyToJob delegates to the Application CRM with the resume profile', async () => {
      const j = job();
      repo.addJob(j);
      await service.applyToJob(WS, j.id, {
        resumeProfileId: 'rp-1',
        notes: 'Referred',
      });
      expect(applicationsService.markApplied).toHaveBeenCalledWith(WS, j.id, {
        resumeProfileId: 'rp-1',
        notes: 'Referred',
      });
    });

    it('404s for a nonexistent job', async () => {
      await expect(service.saveJob(WS, 'nope')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── Pass 1 regressions: Job Detail and targeted resumes ──────────────────
  describe('getJobDetail', () => {
    it('returns the enriched JobOpportunity with a fresh match and state', async () => {
      const j = job({ requiredSkills: ['TypeScript'] });
      repo.addJob(j);
      await service.saveJob(WS, j.id);
      const detail = await service.getJobDetail(WS, j.id);
      expect(detail.id).toBe(j.id);
      expect(detail.match?.matchedSkills).toEqual(['typescript']);
      expect(detail.match?.matcherVersion).toBe(MATCHER_VERSION);
      expect(detail.workspaceState?.isSaved).toBe(true);
    });

    it('404s for an unknown job', async () => {
      await expect(service.getJobDetail(WS, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createTargetedResumeVersion', () => {
    it('creates a version grounded only in matched evidence', async () => {
      const j = job({
        company: 'Stripe',
        requiredSkills: ['TypeScript', 'GraphQL'],
      });
      repo.addJob(j);
      resumeProfileService.listByWorkspace.mockResolvedValue([resumeProfile()]);
      resumeProfileService.createVersion.mockImplementation(
        (_ws: string, rpId: string, input: Record<string, unknown>) =>
          Promise.resolve({ id: 'ver-1', resumeProfileId: rpId, ...input }),
      );

      const result = await service.createTargetedResumeVersion(j.id, WS);

      expect(result.version).toMatchObject({
        targetCompany: 'Stripe',
        resumeProfileId: 'rp-a',
      });
      expect(
        (
          result.version as unknown as {
            selectedRecordIds: { skillIds: string[] };
          }
        ).selectedRecordIds.skillIds,
      ).toEqual(['sk-1']);
      expect(result.analysis.gaps.missingRequiredSkills).toEqual(['graphql']);
      expect(
        result.analysis.targetingRecommendations.prioritySkillNames,
      ).toEqual(['typescript']);
    });

    it('rejects a supplied resume profile that is not in the workspace', async () => {
      const j = job();
      repo.addJob(j);
      resumeProfileService.findById.mockResolvedValue(undefined);
      await expect(
        service.createTargetedResumeVersion(j.id, WS, 'rp-missing'),
      ).rejects.toThrow(NotFoundException);
      expect(resumeProfileService.createVersion).not.toHaveBeenCalled();
    });
  });
});
