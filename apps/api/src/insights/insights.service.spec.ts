import type { AiCapabilityService } from '../byok/ai-capability.service';
import type { PrismaService } from '../database/prisma.service';
import { InsightsService } from './insights.service';

describe('InsightsService', () => {
  let service: InsightsService;
  let mockPrisma: {
    client: {
      job: {
        count: jest.Mock;
        findMany: jest.Mock;
      };
    };
  };
  let mockAiCapabilityService: {
    resolveCapability: jest.Mock;
    generateCompletion: jest.Mock;
  };

  const workspaceId = 'ws-test-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = {
      client: {
        job: {
          count: jest.fn(),
          findMany: jest.fn(),
        },
      },
    };
    mockAiCapabilityService = {
      resolveCapability: jest.fn(),
      generateCompletion: jest.fn(),
    };

    service = new InsightsService(
      mockPrisma as unknown as PrismaService,
      mockAiCapabilityService as unknown as AiCapabilityService,
    );
  });

  describe('getMarketIntelligence', () => {
    it('returns honest missing data state when no jobs have been ingested', async () => {
      mockPrisma.client.job.count.mockResolvedValue(0);

      const res = await service.getMarketIntelligence(workspaceId);
      expect(res.available).toBe(false);
      expect(res.jobDataCount).toBe(0);
      expect(res.reason).toContain('Market data has not been ingested yet');
      expect(mockAiCapabilityService.resolveCapability).not.toHaveBeenCalled();
    });

    it('returns honest capability-unavailable state when jobs exist but AI is not configured', async () => {
      mockPrisma.client.job.count.mockResolvedValue(42);
      mockPrisma.client.job.findMany.mockResolvedValue([]);
      mockAiCapabilityService.resolveCapability.mockResolvedValue({
        available: false,
        reason: 'AI capability is not configured.',
      });

      const res = await service.getMarketIntelligence(workspaceId);
      expect(res.available).toBe(false);
      expect(res.jobDataCount).toBe(42);
      expect(res.reason).toContain('AI capability is not configured');
    });

    it('analyzes real ingested job data when both jobs and AI capability exist', async () => {
      mockPrisma.client.job.count.mockResolvedValue(2);
      mockPrisma.client.job.findMany.mockResolvedValue([
        {
          title: 'Frontend Engineer',
          company: 'Acme',
          requiredSkills: ['React', 'TypeScript'],
          isRemote: true,
        },
        {
          title: 'Backend Engineer',
          company: 'Globex',
          requiredSkills: ['Node.js', 'TypeScript'],
          isRemote: false,
        },
      ]);
      mockAiCapabilityService.resolveCapability.mockResolvedValue({
        available: true,
      });
      mockAiCapabilityService.generateCompletion.mockResolvedValue({
        available: true,
        text: 'Strong demand for TypeScript observed across ingested roles.',
      });

      const res = await service.getMarketIntelligence(workspaceId);
      expect(res.available).toBe(true);
      expect(res.topRequiredSkills).toContain('TypeScript');
      expect(res.topRemoteRoles).toContain('Frontend Engineer');
      expect(res.insightsSummary).toContain('TypeScript');
      expect(res.skillDemand).toEqual([
        { skill: 'TypeScript', jobCount: 2 },
        { skill: 'Node.js', jobCount: 1 },
        { skill: 'React', jobCount: 1 },
      ]);
    });

    it('AI failure → available:false with real aggregates only (no fabricated summary)', async () => {
      mockPrisma.client.job.count.mockResolvedValue(1);
      mockPrisma.client.job.findMany.mockResolvedValue([
        {
          title: 'Data Analyst',
          company: 'Acme',
          requiredSkills: ['SQL'],
          isRemote: true,
        },
      ]);
      mockAiCapabilityService.resolveCapability.mockResolvedValue({
        available: true,
      });
      mockAiCapabilityService.generateCompletion.mockResolvedValue({
        available: false,
        failureReason: 'provider_error',
        reason: 'AI provider call failed: HTTP 429',
      });

      const res = await service.getMarketIntelligence(workspaceId);

      expect(res.available).toBe(false);
      expect(res.failureReason).toBe('provider_error');
      expect(res.reason).toContain('HTTP 429');
      expect(res.insightsSummary).toBeUndefined();
      expect(res.skillDemand).toEqual([{ skill: 'SQL', jobCount: 1 }]);
      expect(res.sampleSize).toBe(1);
    });

    it('AI not configured still returns real aggregates, flagged not_configured', async () => {
      mockPrisma.client.job.count.mockResolvedValue(1);
      mockPrisma.client.job.findMany.mockResolvedValue([
        {
          title: 'Nurse',
          company: 'Clinic',
          requiredSkills: ['Patient Care', 'patient care'],
          isRemote: false,
        },
      ]);
      mockAiCapabilityService.resolveCapability.mockResolvedValue({
        available: false,
      });

      const res = await service.getMarketIntelligence(workspaceId);

      expect(res.available).toBe(false);
      expect(res.failureReason).toBe('not_configured');
      // Counted once per listing, not once per mention.
      expect(res.skillDemand).toEqual([{ skill: 'Patient Care', jobCount: 1 }]);
      expect(mockAiCapabilityService.generateCompletion).not.toHaveBeenCalled();
    });
  });

  describe('getCareerHandbook', () => {
    it('returns static educational reference material across multiple fields without AI', () => {
      const res = service.getCareerHandbook();
      expect(res.careerPaths).toBeDefined();
      expect(res.careerPaths.length).toBeGreaterThanOrEqual(5);

      const fieldIds = res.careerPaths.map((p) => p.fieldId);
      expect(fieldIds).toContain('software-engineering');
      expect(fieldIds).toContain('data-analytics');
      expect(fieldIds).toContain('healthcare');
      expect(fieldIds).toContain('finance');
      expect(fieldIds).toContain('design');

      // Verify structure of Software Engineering path
      const sde = res.careerPaths.find(
        (p) => p.fieldId === 'software-engineering',
      );
      expect(sde?.coreSkills).toContain('Data Structures & Algorithms');
      expect(sde?.studyResources.length).toBeGreaterThan(0);
    });
  });
});
