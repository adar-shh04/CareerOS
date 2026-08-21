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
});
