import { BadRequestException, NotFoundException } from '@nestjs/common';

import type { PrismaService } from '../database/prisma.service';
import { ApplicationsService } from './applications.service';

describe('ApplicationsService', () => {
  let service: ApplicationsService;
  let client: {
    $transaction: jest.Mock;
    application: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    applicationStatusHistory: {
      findMany: jest.Mock;
      create: jest.Mock;
    };
    job: { findUnique: jest.Mock };
    resumeProfile: { findFirst: jest.Mock };
    resumeVersion: { findFirst: jest.Mock };
    workspaceJobState: {
      findUnique: jest.Mock;
      update: jest.Mock;
      upsert: jest.Mock;
    };
  };

  const workspaceId = '00000000-0000-4000-8000-000000000001';
  const jobId = '00000000-0000-4000-8000-000000000002';
  const appId = '00000000-0000-4000-8000-000000000003';
  const resumeProfileId = '00000000-0000-4000-8000-000000000004';
  const stateKey = {
    organizationId_jobId: { organizationId: workspaceId, jobId },
  };

  const mockJob = {
    id: jobId,
    title: 'Senior Engineer',
    company: 'TechCorp',
    location: 'Remote',
    isRemote: true,
    salaryRange: '$150k - $180k',
    salaryMin: 150000,
    salaryMax: 180000,
    salaryCurrency: 'USD',
    source: 'linkedin',
    sourceUrl: 'https://example.com/job/1',
    postedAt: new Date(),
    requiredSkills: ['TypeScript', 'NestJS'],
  };

  const mockApp = {
    id: appId,
    organizationId: workspaceId,
    jobId,
    status: 'saved',
    notes: null,
    appliedAt: null as Date | null,
    resumeProfileId: null as string | null,
    resumeVersionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    job: mockJob,
  };

  beforeEach(() => {
    client = {
      $transaction: jest.fn(),
      application: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      applicationStatusHistory: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      job: { findUnique: jest.fn().mockResolvedValue({ id: jobId }) },
      resumeProfile: {
        findFirst: jest.fn().mockResolvedValue({ id: resumeProfileId }),
      },
      resumeVersion: { findFirst: jest.fn() },
      workspaceJobState: {
        findUnique: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
    };
    // Interactive transactions run against the same mocked client.
    client.$transaction.mockImplementation(
      (fn: (tx: typeof client) => Promise<unknown>) => fn(client),
    );
    service = new ApplicationsService({ client } as unknown as PrismaService);
  });

  describe('listByWorkspace', () => {
    it('returns applications for the workspace with enriched job details', async () => {
      client.application.findMany.mockResolvedValue([mockApp]);
      const result = await service.listByWorkspace(workspaceId);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('saved');
      expect(result[0].job?.title).toBe('Senior Engineer');
      expect(result[0].job?.company).toBe('TechCorp');
      expect(client.application.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: workspaceId },
          include: { job: true },
        }),
      );
    });
  });

  describe('findById', () => {
    it('returns null for a non-UUID id without querying', async () => {
      await expect(service.findById(workspaceId, 'app-1')).resolves.toBeNull();
      expect(client.application.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('creates an application and records initial status history', async () => {
      client.application.findFirst.mockResolvedValue(null);
      client.application.create.mockResolvedValue(mockApp);

      const result = await service.create(workspaceId, {
        jobId,
        status: 'saved',
      });
      expect(result.status).toBe('saved');
      expect(client.applicationStatusHistory.create).toHaveBeenCalled();
    });

    it('throws BadRequestException when duplicate job application exists', async () => {
      client.application.findFirst.mockResolvedValue(mockApp);
      await expect(service.create(workspaceId, { jobId })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException for invalid status', async () => {
      client.application.findFirst.mockResolvedValue(null);
      await expect(
        service.create(workspaceId, { jobId, status: 'invalid' as never }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for an unknown job', async () => {
      client.job.findUnique.mockResolvedValue(null);
      await expect(service.create(workspaceId, { jobId })).rejects.toThrow(
        NotFoundException,
      );
      expect(client.application.create).not.toHaveBeenCalled();
    });

    it('rejects a resume profile that belongs to another workspace', async () => {
      client.resumeProfile.findFirst.mockResolvedValue(null);
      await expect(
        service.create(workspaceId, { jobId, resumeProfileId }),
      ).rejects.toThrow(NotFoundException);
      expect(client.resumeProfile.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: resumeProfileId, organizationId: workspaceId },
        }),
      );
      expect(client.application.create).not.toHaveBeenCalled();
    });

    it('creating as "applied" stamps appliedAt and marks the job state applied', async () => {
      client.application.findFirst.mockResolvedValue(null);
      client.application.create.mockImplementation(
        ({ data }: { data: typeof mockApp }) =>
          Promise.resolve({ ...mockApp, ...data, job: mockJob }),
      );

      const result = await service.create(workspaceId, {
        jobId,
        status: 'applied',
      });

      expect(result.appliedAt).toBeInstanceOf(Date);
      expect(client.workspaceJobState.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: stateKey,
          update: { status: 'applied', appliedAt: result.appliedAt },
        }),
      );
    });

    it('creating as "saved" marks the job state saved', async () => {
      client.application.findFirst.mockResolvedValue(null);
      client.application.create.mockResolvedValue(mockApp);

      await service.create(workspaceId, { jobId, status: 'saved' });

      expect(client.workspaceJobState.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: stateKey,
          update: { status: 'saved', isSaved: true, appliedAt: null },
        }),
      );
    });
  });

  describe('update', () => {
    it('updates status and records history when status changes', async () => {
      client.application.findFirst.mockResolvedValue(mockApp);
      const updatedApp = {
        ...mockApp,
        status: 'applied',
        appliedAt: new Date(),
      };
      client.application.update.mockResolvedValue(updatedApp);

      const result = await service.update(workspaceId, appId, {
        status: 'applied',
      });
      expect(result.status).toBe('applied');
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      expect(client.applicationStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'applied',
            applicationId: appId,
          }),
        }),
      );
      // First move to "applied" records when it happened.
      expect(client.application.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ appliedAt: expect.any(Date) }),
        }),
      );
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      expect(client.workspaceJobState.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { status: 'applied', appliedAt: updatedApp.appliedAt },
        }),
      );
    });

    it('does not record history when status does not change', async () => {
      client.application.findFirst.mockResolvedValue(mockApp);
      client.application.update.mockResolvedValue(mockApp);

      await service.update(workspaceId, appId, { notes: 'Updated notes' });
      expect(client.applicationStatusHistory.create).not.toHaveBeenCalled();
    });

    it('allows clearing appliedAt with null', async () => {
      client.application.findFirst.mockResolvedValue({
        ...mockApp,
        appliedAt: new Date(),
      });
      client.application.update.mockResolvedValue(mockApp);

      await service.update(workspaceId, appId, { appliedAt: null });
      expect(client.application.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ appliedAt: null }) as unknown,
        }),
      );
    });

    it('does not invent an applied date when jumping straight to "interview"', async () => {
      client.application.findFirst.mockResolvedValue(mockApp);
      client.application.update.mockResolvedValue({
        ...mockApp,
        status: 'interview',
      });

      await service.update(workspaceId, appId, { status: 'interview' });

      const call = client.application.update.mock.calls[0] as [
        { data: Record<string, unknown> },
      ];
      expect(call[0].data).not.toHaveProperty('appliedAt');
    });

    it('throws NotFoundException when application does not exist', async () => {
      client.application.findFirst.mockResolvedValue(null);
      await expect(
        service.update(workspaceId, appId, { status: 'applied' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markApplied', () => {
    it('creates an applied Application recording the resume profile when none exists', async () => {
      client.application.findFirst.mockResolvedValue(null);
      client.application.create.mockImplementation(
        ({ data }: { data: typeof mockApp }) =>
          Promise.resolve({ ...mockApp, ...data, job: mockJob }),
      );

      const result = await service.markApplied(workspaceId, jobId, {
        resumeProfileId,
      });

      expect(result.status).toBe('applied');
      expect(result.resumeProfileId).toBe(resumeProfileId);
      expect(result.appliedAt).toBeInstanceOf(Date);
      expect(client.applicationStatusHistory.create).toHaveBeenCalled();
      expect(client.workspaceJobState.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: stateKey,
          update: { status: 'applied', appliedAt: result.appliedAt },
        }),
      );
    });

    it('advances a saved Application to applied', async () => {
      client.application.findFirst.mockResolvedValue(mockApp);
      client.application.update.mockImplementation(
        ({ data }: { data: Partial<typeof mockApp> }) =>
          Promise.resolve({ ...mockApp, ...data }),
      );

      const result = await service.markApplied(workspaceId, jobId, {
        resumeProfileId,
      });

      expect(result.status).toBe('applied');
      expect(result.resumeProfileId).toBe(resumeProfileId);
      expect(client.applicationStatusHistory.create).toHaveBeenCalled();
    });

    it('never regresses an Application already in interview', async () => {
      const interviewing = {
        ...mockApp,
        status: 'interview',
        appliedAt: new Date('2026-08-01'),
      };
      client.application.findFirst.mockResolvedValue(interviewing);
      client.application.update.mockImplementation(
        ({ data }: { data: Partial<typeof mockApp> }) =>
          Promise.resolve({ ...interviewing, ...data }),
      );

      const result = await service.markApplied(workspaceId, jobId, {
        resumeProfileId,
      });

      expect(result.status).toBe('interview');
      expect(result.appliedAt).toEqual(new Date('2026-08-01'));
      expect(result.resumeProfileId).toBe(resumeProfileId);
      expect(client.applicationStatusHistory.create).not.toHaveBeenCalled();
    });

    it('rejects a foreign resume profile and writes nothing', async () => {
      client.resumeProfile.findFirst.mockResolvedValue(null);
      await expect(
        service.markApplied(workspaceId, jobId, { resumeProfileId }),
      ).rejects.toThrow(NotFoundException);
      expect(client.$transaction).not.toHaveBeenCalled();
    });

    it('404s for an unknown job', async () => {
      client.job.findUnique.mockResolvedValue(null);
      await expect(service.markApplied(workspaceId, jobId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('hasAppliedToJob', () => {
    it.each([
      ['saved', null, false],
      ['applied', new Date(), true],
      ['interview', null, true],
      ['rejected', new Date(), true],
      ['withdrawn', null, false],
      ['withdrawn', new Date(), true],
    ])('status %p (appliedAt %p) → %p', async (status, appliedAt, expected) => {
      client.application.findFirst.mockResolvedValue({ status, appliedAt });
      await expect(service.hasAppliedToJob(workspaceId, jobId)).resolves.toBe(
        expected,
      );
    });
  });

  describe('delete', () => {
    it('deletes the application and reverts an applied job state', async () => {
      client.application.findFirst.mockResolvedValue(mockApp);
      client.application.delete.mockResolvedValue(mockApp);
      client.workspaceJobState.findUnique.mockResolvedValue({
        status: 'applied',
        isSaved: true,
      });

      await expect(service.delete(workspaceId, appId)).resolves.not.toThrow();
      expect(client.workspaceJobState.update).toHaveBeenCalledWith({
        where: stateKey,
        data: { status: 'saved', appliedAt: null },
      });
    });

    it('throws NotFoundException when application does not exist', async () => {
      client.application.findFirst.mockResolvedValue(null);
      await expect(service.delete(workspaceId, appId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
