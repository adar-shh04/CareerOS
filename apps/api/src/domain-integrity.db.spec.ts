/**
 * Stabilization Pass 2 — domain & data integrity against a real PostgreSQL
 * database (real Prisma repositories, real services, migrated schema incl. the
 * resume-reference trigger). Runs only when DATABASE_URL is set; point it at a
 * disposable, fully migrated database. Every row it creates is namespaced by
 * random ids and removed afterwards.
 */
import { randomUUID } from 'node:crypto';

import { NotFoundException } from '@nestjs/common';

import { ApplicationsService } from './applications/applications.service';
import { CareerProfileService } from './career-profile/career-profile.service';
import type { MasterCareerProfile } from './career-profile/career-profile.types';
import { PrismaCareerProfileRepository } from './career-profile/prisma-career-profile.repository';
import { PrismaService } from './database/prisma.service';
import type { JobIngestionService } from './jobs/ingestion/job-ingestion.service';
import { JobAnalysisService } from './jobs/job-analysis.service';
import { JobMatchingService } from './jobs/job-matching.service';
import { JobsService } from './jobs/jobs.service';
import { MATCHER_VERSION } from './jobs/match-freshness';
import { PrismaJobsRepository } from './jobs/prisma-jobs.repository';
import { PrismaResumeProfileRepository } from './resume-profile/prisma-resume-profile.repository';
import { ResumeProfileService } from './resume-profile/resume-profile.service';

const describeWithDatabase = process.env.DATABASE_URL
  ? describe
  : describe.skip;

describeWithDatabase('Domain & data integrity (PostgreSQL)', () => {
  const prisma = new PrismaService();
  const jobsRepo = new PrismaJobsRepository(prisma);
  const careerProfiles = new CareerProfileService(
    new PrismaCareerProfileRepository(prisma),
  );
  const resumeProfiles = new ResumeProfileService(
    new PrismaResumeProfileRepository(prisma),
    careerProfiles,
  );
  const applications = new ApplicationsService(prisma);
  const jobs = new JobsService(
    jobsRepo,
    new JobMatchingService(),
    new JobAnalysisService(),
    careerProfiles,
    resumeProfiles,
    {} as JobIngestionService,
    applications,
  );

  const wsA = randomUUID();
  const wsB = randomUUID();
  const token = `zq${randomUUID().slice(0, 8)}`; // isolates our jobs in the global catalog
  const jobIds: string[] = [];
  const projectId = randomUUID();
  const skillId = randomUUID();

  const masterInput = (withProject = true) => ({
    identity: { fullName: 'Integrity Tester', location: 'Remote' },
    skills: [
      { id: skillId, name: 'TypeScript' },
      { id: randomUUID(), name: 'React' },
    ],
    experiences: [
      {
        id: randomUUID(),
        company: 'Acme',
        title: 'Engineer',
        startDate: '2020-01',
        endDate: '2024-01',
      },
    ],
    projects: withProject
      ? [{ id: projectId, name: 'Radar', technologies: ['TypeScript'] }]
      : [],
  });

  const currentMaster = async (): Promise<MasterCareerProfile> => {
    const master = await careerProfiles.findByWorkspace(wsA);
    if (!master) throw new Error('master profile missing');
    return master;
  };

  const createJob = async (overrides: Record<string, unknown> = {}) => {
    const job = await prisma.client.job.create({
      data: {
        company: `${token} Co`,
        title: `${token} Engineer`,
        location: 'Remote',
        isRemote: true,
        requiredSkills: ['COBOL'],
        ...overrides,
      },
    });
    jobIds.push(job.id);
    return job;
  };

  beforeAll(async () => {
    await prisma.client.organization.createMany({
      data: [
        { id: wsA, name: 'Integrity A', slug: `int-a-${wsA}` },
        { id: wsB, name: 'Integrity B', slug: `int-b-${wsB}` },
      ],
    });
    await careerProfiles.save(wsA, masterInput());
  });

  afterAll(async () => {
    await prisma.client.masterCareerProfile.deleteMany({
      where: { organizationId: { in: [wsA, wsB] } },
    });
    await prisma.client.organization.deleteMany({
      where: { id: { in: [wsA, wsB] } },
    });
    await prisma.client.job.deleteMany({ where: { id: { in: jobIds } } });
    await prisma.onModuleDestroy();
  });

  // ── Area 6 ───────────────────────────────────────────────────────────────
  describe('Job Radar ranking / pagination / filtering', () => {
    it('ranks the whole filtered set before paging: an old strong match beats 55 newer non-matches', async () => {
      for (let i = 0; i < 55; i++) {
        await createJob({
          postedAt: new Date(Date.UTC(2026, 8, 1 + (i % 25))),
          location: `Remote batch-${String(i)}`,
        });
      }
      const strong = await createJob({
        requiredSkills: ['TypeScript', 'React'],
        postedAt: new Date(Date.UTC(2024, 0, 1)),
      });

      const page1 = await jobs.listByWorkspace(wsA, {
        query: token,
        limit: 50,
      });
      expect(page1).toHaveLength(50);
      expect(page1[0]?.id).toBe(strong.id);

      const page2 = await jobs.listByWorkspace(wsA, {
        query: token,
        limit: 50,
        offset: 50,
      });
      expect(page2).toHaveLength(6);
      expect(new Set([...page1, ...page2].map((j) => j.id)).size).toBe(56);
    });

    it('persists every candidate match with its source inputs', async () => {
      const rows = await prisma.client.jobMatch.findMany({
        where: { organizationId: wsA, jobId: { in: jobIds } },
      });
      expect(rows).toHaveLength(jobIds.length);
      expect(rows.every((r) => r.matcherVersion === MATCHER_VERSION)).toBe(
        true,
      );
      expect(rows.every((r) => r.profileVersion === 1)).toBe(true);
      expect(rows.every((r) => r.weightsKey === 'default')).toBe(true);
    });

    it('NULL postedAt is ordered after dated jobs, deterministically', async () => {
      const t = `${token}null`;
      const dated = await createJob({
        title: `${t} A`,
        postedAt: new Date(Date.UTC(2020, 0, 1)),
      });
      const undated = await createJob({ title: `${t} B`, postedAt: null });
      const first = await jobs.listByWorkspace(wsA, { query: t });
      const second = await jobs.listByWorkspace(wsA, { query: t });
      expect(first.map((j) => j.id)).toEqual([dated.id, undated.id]);
      expect(second.map((j) => j.id)).toEqual(first.map((j) => j.id));
    });

    it('savedOnly finds a saved job ranked far beyond page 1', async () => {
      const lowRanked = jobIds[40];
      await jobs.saveJob(wsA, lowRanked);
      const saved = await jobs.listByWorkspace(wsA, {
        query: token,
        savedOnly: true,
      });
      expect(saved.map((j) => j.id)).toEqual([lowRanked]);
      // Workspace-scoped: another workspace does not see it as saved.
      const other = await jobs.listByWorkspace(wsB, {
        query: token,
        savedOnly: true,
      });
      expect(other).toEqual([]);
    });

    it('hideDismissed excludes dismissed jobs across all pages', async () => {
      await jobs.dismissJob(wsA, jobIds[3]);
      const visible = await jobs.listByWorkspace(wsA, {
        query: token,
        hideDismissed: true,
        limit: 100,
      });
      expect(visible.map((j) => j.id)).not.toContain(jobIds[3]);
      expect(visible.length).toBe(jobIds.length - 1);
    });

    it('search + skill together apply BOTH filters (previously the skill filter was dropped)', async () => {
      const withSkill = await createJob({ requiredSkills: ['Rust'] });
      const result = await jobs.listByWorkspace(wsA, {
        query: token,
        skill: 'Rust',
      });
      expect(result.map((j) => j.id)).toEqual([withSkill.id]);
    });
  });

  // ── Area 3 ───────────────────────────────────────────────────────────────
  describe('JobMatch freshness', () => {
    it('recomputes after the master profile changes and records the new version', async () => {
      // React is only listed as a skill (not a project technology).
      const job = await createJob({
        title: `${token} fresh`,
        requiredSkills: ['React'],
      });
      const [before] = await jobs.listByWorkspace(wsA, {
        query: `${token} fresh`,
      });
      expect(before.match?.matchedSkills).toEqual(['react']);
      const current = await currentMaster();
      try {
        await careerProfiles.save(wsA, {
          ...current,
          skills: [],
        });

        const [after] = await jobs.listByWorkspace(wsA, {
          query: `${token} fresh`,
        });
        const row = await prisma.client.jobMatch.findFirst({
          where: { organizationId: wsA, jobId: job.id, resumeProfileId: null },
        });
        expect(row?.profileVersion).toBe(current.version + 1);
        expect(after.match?.missingSkills).toEqual(['react']);
      } finally {
        await careerProfiles.save(wsA, {
          ...(await currentMaster()),
          ...masterInput(),
        }); // restore for later tests
      }
    });

    it('a legacy row without source inputs is recomputed', async () => {
      const job = await createJob({
        title: `${token} legacy`,
        requiredSkills: ['TypeScript'],
      });
      await jobs.listByWorkspace(wsA, { query: `${token} legacy` });
      await prisma.client.jobMatch.updateMany({
        where: { organizationId: wsA, jobId: job.id },
        data: {
          matcherVersion: null,
          profileVersion: null,
          overallScore: 0.01,
        },
      });
      const [again] = await jobs.listByWorkspace(wsA, {
        query: `${token} legacy`,
      });
      expect(again.match?.overallScore).not.toBe(0.01);
      expect(again.match?.matcherVersion).toBe(MATCHER_VERSION);
    });
  });

  // ── Area 5 ───────────────────────────────────────────────────────────────
  describe('persisted job normalization', () => {
    it('normalized seniority / experience survive persistence and drive matching', async () => {
      const saved = await jobsRepo.upsertCanonicalJob({
        normalized: true,
        source: 'integrity-test',
        externalId: randomUUID(),
        company: `${token} Norm`,
        title: `${token} Senior Engineer`,
        location: 'Remote',
        seniority: 'Senior',
        experienceRequirements: { minYears: 6, text: '6+ years' },
        requiredSkills: ['TypeScript'],
      });
      jobIds.push(saved.id);

      const read = await jobsRepo.findJobById(saved.id);
      expect(read).toMatchObject({
        seniority: 'Senior',
        experienceRequirements: { minYears: 6, text: '6+ years' },
        isNormalized: true,
      });

      const detail = await jobs.getJobDetail(wsA, saved.id);
      expect(detail.seniority).toBe('Senior');
      expect(detail.match?.evidence).toMatchObject({
        jobSeniority: 'Senior',
        jobSenioritySource: 'normalized',
        requiredYears: 6,
        requiredYearsSource: 'normalized',
      });
    });

    it('a legacy job (never normalized) is distinguishable and uses the labelled fallback', async () => {
      const legacy = await createJob({ title: `${token} Staff Engineer` });
      const read = await jobsRepo.findJobById(legacy.id);
      expect(read?.isNormalized).toBe(false);
      expect(read?.seniority).toBeUndefined();
      const detail = await jobs.getJobDetail(wsA, legacy.id);
      expect(detail.match?.evidence).toMatchObject({
        jobSeniority: 'Staff / Lead',
        jobSenioritySource: 'inferred_from_title',
        requiredYearsSource: 'unknown',
      });
    });
  });

  // ── Areas 1 and 4 ────────────────────────────────────────────────────────
  describe('Application ↔ Job Radar ↔ ResumeProfile integrity', () => {
    it('concurrent applies to the same job yield exactly one application, no errors', async () => {
      const job = await createJob({ title: `${token} race` });
      const results = await Promise.allSettled(
        Array.from({ length: 6 }, () => applications.markApplied(wsA, job.id)),
      );
      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
      expect(
        await prisma.client.application.count({
          where: { organizationId: wsA, jobId: job.id },
        }),
      ).toBe(1);

      const job2 = await createJob({ title: `${token} race2` });
      const creates = await Promise.allSettled(
        Array.from({ length: 6 }, () =>
          applications.create(wsA, { jobId: job2.id }),
        ),
      );
      expect(creates.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      for (const r of creates) {
        if (r.status === 'rejected') {
          expect(String(r.reason)).toMatch(/already exists/);
        }
      }
    });

    it('applied state flows from the Application and reverts when it is deleted', async () => {
      const job = await createJob({ title: `${token} apply` });
      await jobs.saveJob(wsA, job.id);
      const app = await applications.markApplied(wsA, job.id);

      let state = await prisma.client.workspaceJobState.findUnique({
        where: { organizationId_jobId: { organizationId: wsA, jobId: job.id } },
      });
      expect(state).toMatchObject({ status: 'applied', isSaved: true });
      expect(state?.appliedAt?.getTime()).toBe(app.appliedAt?.getTime());

      await applications.delete(wsA, app.id);
      state = await prisma.client.workspaceJobState.findUnique({
        where: { organizationId_jobId: { organizationId: wsA, jobId: job.id } },
      });
      expect(state).toMatchObject({ status: 'saved', appliedAt: null });
    });

    it('rejects cross-workspace and nonexistent resume profiles (service and database)', async () => {
      const job = await createJob({ title: `${token} refs` });
      const foreign = await prisma.client.resumeProfile.create({
        data: { organizationId: wsB, name: 'B profile' },
      });

      await expect(
        applications.markApplied(wsA, job.id, { resumeProfileId: foreign.id }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        applications.markApplied(wsA, job.id, {
          resumeProfileId: randomUUID(),
        }),
      ).rejects.toThrow(NotFoundException);

      // Database-level guarantee, bypassing the service entirely.
      const app = await applications.markApplied(wsA, job.id);
      await expect(
        prisma.client.application.update({
          where: { id: app.id },
          data: { resumeProfileId: foreign.id },
        }),
        // The foreign profile EXISTS, so the plain FK is satisfied: only the
        // same-workspace trigger can reject this (surfaced by Prisma as a
        // foreign-key violation).
      ).rejects.toThrow(/Foreign key constraint/);
      await expect(
        prisma.client.application.update({
          where: { id: app.id },
          data: { resumeProfileId: randomUUID() },
        }),
      ).rejects.toThrow();
    });

    it('valid same-workspace reference; deleting the profile keeps the application and cascades its matches', async () => {
      const job = await createJob({
        title: `${token} valid`,
        requiredSkills: ['TypeScript'],
      });
      const profile = await resumeProfiles.create(wsA, {
        name: 'Radar resume',
      });
      const version = await resumeProfiles.createVersion(wsA, profile.id, {});

      const app = await applications.markApplied(wsA, job.id, {
        resumeProfileId: profile.id,
      });
      await applications.update(wsA, app.id, { resumeVersionId: version.id });
      await jobs.getJobDetail(wsA, job.id); // generic (Master Profile) match
      await jobs.computeAndPersistMatch(job.id, wsA, profile.id);
      expect(
        await prisma.client.jobMatch.count({
          where: { organizationId: wsA, jobId: job.id },
        }),
      ).toBe(2);
      expect((await applications.findById(wsA, app.id))?.resumeVersionId).toBe(
        version.id,
      );

      await resumeProfiles.delete(wsA, profile.id);

      const after = await applications.findById(wsA, app.id);
      expect(after).toMatchObject({
        status: 'applied',
        resumeProfileId: null,
        resumeVersionId: null,
      });
      const matches = await prisma.client.jobMatch.findMany({
        where: { organizationId: wsA, jobId: job.id },
      });
      expect(matches.map((m) => m.resumeProfileId)).toEqual([null]);
    });
  });

  // ── Area 7 ───────────────────────────────────────────────────────────────
  describe('Master Profile edits do not strand Resume Profiles', () => {
    it('reopen, edit, generate a version, and keep history after removing referenced records', async () => {
      const profile = await resumeProfiles.create(wsA, {
        name: 'Referencing profile',
        priorityProjectIds: [projectId],
        prioritySkillIds: [skillId],
      });
      const oldVersion = await resumeProfiles.createVersion(
        wsA,
        profile.id,
        {},
      );

      // Real Master Profile save that drops the referenced project.
      await careerProfiles.save(wsA, {
        ...(await currentMaster()),
        projects: [],
      });

      const reopened = await resumeProfiles.findById(wsA, profile.id);
      expect(reopened?.priorityProjectIds).toEqual([]);
      expect(reopened?.prioritySkillIds).toEqual([skillId]);

      const edited = await resumeProfiles.update(wsA, profile.id, {
        ...(reopened as object),
        name: 'Still editable',
        priorityProjectIds: [projectId], // stale id echoed back by a client
      } as never);
      expect(edited.name).toBe('Still editable');
      expect(edited.priorityProjectIds).toEqual([]);

      const newVersion = await resumeProfiles.createVersion(
        wsA,
        profile.id,
        {},
      );
      expect(newVersion.selectedRecordIds.projectIds).toEqual([]);

      const historical = await resumeProfiles.findVersionById(
        wsA,
        profile.id,
        oldVersion.id,
      );
      expect(historical?.selectedRecordIds.projectIds).toEqual([projectId]);
      expect(
        historical?.masterProfileSnapshot.projects.map((p) => p.id),
      ).toEqual([projectId]);
    });
  });
});
