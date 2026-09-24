import type { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { PrismaJobsRepository } from './prisma-jobs.repository';

describe('PrismaJobsRepository', () => {
  let repository: PrismaJobsRepository;
  let mockJob: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let mockPrismaService: {
    client: {
      job: typeof mockJob;
      jobMatch: unknown;
      workspaceJobState: unknown;
    };
  };

  const sampleDbJob = {
    id: 'job-123',
    externalId: 'ext-001',
    fingerprint: 'fp-001',
    source: 'linkedin',
    sourceUrl: 'https://linkedin.com/jobs/123',
    company: 'Acme Inc',
    title: 'Senior Engineer',
    location: 'Remote',
    isRemote: true,
    remotePolicy: 'REMOTE',
    employmentType: 'FULL_TIME',
    salaryMin: 120000,
    salaryMax: 160000,
    salaryCurrency: 'USD',
    salaryRange: '$120k - $160k',
    description: 'Great job',
    requiredSkills: ['TypeScript', 'Node.js'],
    preferredSkills: ['NestJS'],
    postedAt: new Date('2026-08-01T00:00:00.000Z'),
    expiresAt: null,
    rawMetadata: null,
    normalizedMetadata: null,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    mockJob = {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    mockPrismaService = {
      client: {
        job: mockJob,
        jobMatch: {},
        workspaceJobState: {},
      },
    };

    repository = new PrismaJobsRepository(
      mockPrismaService as unknown as PrismaService,
    );
  });

  describe('upsertCanonicalJob concurrency & safety', () => {
    it('creates job cleanly when it does not exist and no collision occurs', async () => {
      mockJob.findUnique.mockResolvedValue(null);
      mockJob.create.mockResolvedValue(sampleDbJob);

      const result = await repository.upsertCanonicalJob({
        source: 'linkedin',
        externalId: 'ext-001',
        company: 'Acme Inc',
        title: 'Senior Engineer',
        location: 'Remote',
      });

      expect(result.id).toBe('job-123');
      expect(result.title).toBe('Senior Engineer');
      expect(mockJob.create).toHaveBeenCalledTimes(1);
    });

    it('updates existing job when findExisting detects it initially', async () => {
      mockJob.findUnique.mockResolvedValue(sampleDbJob);
      mockJob.update.mockResolvedValue({
        ...sampleDbJob,
        title: 'Lead Engineer',
      });

      const result = await repository.upsertCanonicalJob({
        source: 'linkedin',
        externalId: 'ext-001',
        company: 'Acme Inc',
        title: 'Lead Engineer',
        location: 'Remote',
      });

      expect(result.title).toBe('Lead Engineer');
      expect(mockJob.update).toHaveBeenCalledTimes(1);
      expect(mockJob.create).not.toHaveBeenCalled();
    });

    it('handles TOCTOU race condition when create throws P2002 on source_externalId', async () => {
      // Step 1: initial find returns null (simulating concurrent ingestion)
      mockJob.findUnique.mockResolvedValueOnce(null);

      // Step 2: create throws P2002 (another process inserted just before us)
      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the constraint: `jobs_source_external_id_key`',
        {
          code: 'P2002',
          clientVersion: '7.9.0',
        },
      );
      mockJob.create.mockRejectedValueOnce(p2002Error);

      // Step 3: retry findUnique finds the concurrently created job
      mockJob.findUnique.mockResolvedValueOnce(sampleDbJob);
      mockJob.update.mockResolvedValue({
        ...sampleDbJob,
        updatedAt: new Date('2026-08-01T00:01:00.000Z'),
      });

      const result = await repository.upsertCanonicalJob({
        source: 'linkedin',
        externalId: 'ext-001',
        company: 'Acme Inc',
        title: 'Senior Engineer',
        location: 'Remote',
      });

      expect(result.id).toBe('job-123');
      expect(mockJob.create).toHaveBeenCalledTimes(1);
      expect(mockJob.update).toHaveBeenCalledTimes(1);
    });

    it('handles TOCTOU race condition when create throws P2002 on fingerprint', async () => {
      mockJob.findUnique.mockResolvedValueOnce(null);

      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the constraint: `jobs_fingerprint_key`',
        {
          code: 'P2002',
          clientVersion: '7.9.0',
        },
      );
      mockJob.create.mockRejectedValueOnce(p2002Error);

      // Retry finds the job by fingerprint
      mockJob.findUnique.mockResolvedValueOnce(sampleDbJob);
      mockJob.update.mockResolvedValue(sampleDbJob);

      const result = await repository.upsertCanonicalJob({
        fingerprint: 'fp-001',
        company: 'Acme Inc',
        title: 'Senior Engineer',
        location: 'Remote',
      });

      expect(result.id).toBe('job-123');
      expect(mockJob.create).toHaveBeenCalledTimes(1);
      expect(mockJob.update).toHaveBeenCalledTimes(1);
    });

    it('creates jobs without externalId or fingerprint directly without unique lookups', async () => {
      const dbJobNoExt = {
        ...sampleDbJob,
        externalId: null,
        fingerprint: null,
      };
      mockJob.create.mockResolvedValue(dbJobNoExt);

      const result = await repository.upsertCanonicalJob({
        company: 'Acme Inc',
        title: 'Senior Engineer',
        location: 'Remote',
      });

      expect(result.id).toBe('job-123');
      expect(mockJob.findUnique).not.toHaveBeenCalled();
      expect(mockJob.create).toHaveBeenCalledTimes(1);
    });

    it('re-throws non-P2002 database errors', async () => {
      mockJob.findUnique.mockResolvedValue(null);
      mockJob.create.mockRejectedValue(new Error('Database connection lost'));

      await expect(
        repository.upsertCanonicalJob({
          source: 'linkedin',
          externalId: 'ext-001',
          company: 'Acme Inc',
          title: 'Senior Engineer',
          location: 'Remote',
        }),
      ).rejects.toThrow('Database connection lost');
    });
  });

  // job_matches uniqueness uses PARTIAL unique indexes, which PostgreSQL cannot
  // use as an ON CONFLICT arbiter — so Prisma `upsert` must never be used here.
  describe('upsertJobMatch', () => {
    const output = {
      overallScore: 0.8,
      dimensionScores: {
        skill: 0.9,
        role: 0.7,
        experience: 0.6,
        location: 1,
        seniority: 0.75,
      },
      matchedSkills: ['typescript'],
      missingSkills: [],
      matchedPreferredSkills: [],
      confidence: 1,
      explanation: 'x',
      evidence: {
        matchedSkills: ['typescript'],
        missingSkills: [],
        matchedPreferredSkills: [],
        profileSkillCount: 1,
        requiredSkillCount: 1,
        experienceYears: 2,
      },
    };
    const row = (resumeProfileId: string | null) => ({
      id: 'm-1',
      jobId: 'job-123',
      organizationId: 'ws-1',
      resumeProfileId,
      overallScore: 0.8,
      skillScore: 0.9,
      roleScore: 0.7,
      experienceScore: 0.6,
      locationScore: 1,
      seniorityScore: 0.75,
      matchedSkills: ['typescript'],
      missingSkills: [],
      confidence: 1,
      explanation: 'x',
      evidence: null,
      profileVersion: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    let jobMatch: {
      upsert: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };

    beforeEach(() => {
      jobMatch = {
        upsert: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      };
      mockPrismaService.client.jobMatch = jobMatch;
    });

    it('creates a profile-specific match keyed by resumeProfileId without upsert', async () => {
      jobMatch.findFirst.mockResolvedValue(null);
      jobMatch.create.mockResolvedValue(row('rp-1'));

      const stored = await repository.upsertJobMatch(
        'job-123',
        'ws-1',
        output,
        'rp-1',
        3,
      );

      expect(jobMatch.upsert).not.toHaveBeenCalled();
      expect(jobMatch.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: 'ws-1',
          jobId: 'job-123',
          resumeProfileId: 'rp-1',
        },
      });
      expect(jobMatch.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ resumeProfileId: 'rp-1' }) as unknown,
      });
      expect(stored.resumeProfileId).toBe('rp-1');
    });

    it('updates the existing profile-specific match in place', async () => {
      jobMatch.findFirst.mockResolvedValue(row('rp-1'));
      jobMatch.update.mockResolvedValue(row('rp-1'));

      await repository.upsertJobMatch('job-123', 'ws-1', output, 'rp-1', 3);

      expect(jobMatch.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'm-1' } }),
      );
      expect(jobMatch.create).not.toHaveBeenCalled();
    });

    it('keeps the profile-agnostic match separate (resumeProfileId null)', async () => {
      jobMatch.findFirst.mockResolvedValue(null);
      jobMatch.create.mockResolvedValue(row(null));

      await repository.upsertJobMatch('job-123', 'ws-1', output);

      expect(jobMatch.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: 'ws-1',
          jobId: 'job-123',
          resumeProfileId: null,
        },
      });
    });

    it('resolves a concurrent insert (P2002) by updating the winning row', async () => {
      jobMatch.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(row('rp-1'));
      jobMatch.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: '7.9.0',
        }),
      );
      jobMatch.update.mockResolvedValue(row('rp-1'));

      const stored = await repository.upsertJobMatch(
        'job-123',
        'ws-1',
        output,
        'rp-1',
        3,
      );

      expect(jobMatch.update).toHaveBeenCalledTimes(1);
      expect(stored.resumeProfileId).toBe('rp-1');
    });
  });
});
