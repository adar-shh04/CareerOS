import { BadRequestException, NotFoundException } from '@nestjs/common';

import type { PrismaService } from '../database/prisma.service';
import { ApplicationsService } from './applications.service';

describe('ApplicationsService', () => {
  let service: ApplicationsService;
  let mockPrisma: {
    client: {
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
    };
  };

  const workspaceId = 'ws-1';
  const jobId = 'job-1';
  const appId = 'app-1';

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
    appliedAt: null,
    resumeProfileId: null,
    resumeVersionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    job: mockJob,
  };

  beforeEach(() => {
    mockPrisma = {
      client: {
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
      },
    };
    service = new ApplicationsService(mockPrisma as unknown as PrismaService);
  });

  describe('listByWorkspace', () => {
    it('returns applications for the workspace with enriched job details', async () => {
      mockPrisma.client.application.findMany.mockResolvedValue([mockApp]);
      const result = await service.listByWorkspace(workspaceId);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('saved');
      expect(result[0].job?.title).toBe('Senior Engineer');
      expect(result[0].job?.company).toBe('TechCorp');
      expect(mockPrisma.client.application.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: workspaceId },
          include: { job: true },
        }),
      );
    });
  });

  describe('create', () => {
    it('creates an application and records initial status history', async () => {
      mockPrisma.client.application.findFirst.mockResolvedValue(null);
      mockPrisma.client.application.create.mockResolvedValue(mockApp);
      mockPrisma.client.applicationStatusHistory.create.mockResolvedValue({});

      const result = await service.create(workspaceId, {
        jobId,
        status: 'saved',
      });
      expect(result.status).toBe('saved');
      expect(
        mockPrisma.client.applicationStatusHistory.create,
      ).toHaveBeenCalled();
    });

    it('throws BadRequestException when duplicate job application exists', async () => {
      mockPrisma.client.application.findFirst.mockResolvedValue(mockApp);
      await expect(service.create(workspaceId, { jobId })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException for invalid status', async () => {
      mockPrisma.client.application.findFirst.mockResolvedValue(null);
      await expect(
        service.create(workspaceId, { jobId, status: 'invalid' as never }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('updates status and records history when status changes', async () => {
      mockPrisma.client.application.findFirst.mockResolvedValue(mockApp);
      const updatedApp = { ...mockApp, status: 'applied' };
      mockPrisma.client.application.update.mockResolvedValue(updatedApp);
      mockPrisma.client.applicationStatusHistory.create.mockResolvedValue({});

      const result = await service.update(workspaceId, appId, {
        status: 'applied',
      });
      expect(result.status).toBe('applied');
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      expect(
        mockPrisma.client.applicationStatusHistory.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'applied',
            applicationId: appId,
          }),
        }),
      );
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    });

    it('does not record history when status does not change', async () => {
      mockPrisma.client.application.findFirst.mockResolvedValue(mockApp);
      mockPrisma.client.application.update.mockResolvedValue(mockApp);

      await service.update(workspaceId, appId, { notes: 'Updated notes' });
      expect(
        mockPrisma.client.applicationStatusHistory.create,
      ).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when application does not exist', async () => {
      mockPrisma.client.application.findFirst.mockResolvedValue(null);
      await expect(
        service.update(workspaceId, appId, { status: 'applied' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('deletes the application', async () => {
      mockPrisma.client.application.findFirst.mockResolvedValue(mockApp);
      mockPrisma.client.application.delete.mockResolvedValue(mockApp);
      await expect(service.delete(workspaceId, appId)).resolves.not.toThrow();
    });

    it('throws NotFoundException when application does not exist', async () => {
      mockPrisma.client.application.findFirst.mockResolvedValue(null);
      await expect(service.delete(workspaceId, appId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
