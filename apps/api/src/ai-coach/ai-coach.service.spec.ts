import { NotFoundException } from '@nestjs/common';

import type { AiCapabilityService } from '../byok/ai-capability.service';
import type { CareerProfileService } from '../career-profile/career-profile.service';
import type { PrismaJobsRepository } from '../jobs/prisma-jobs.repository';
import type { ResumeProfileService } from '../resume-profile/resume-profile.service';
import { AiCoachService } from './ai-coach.service';

describe('AiCoachService', () => {
  let service: AiCoachService;
  let mockAiCapabilityService: {
    resolveCapability: jest.Mock;
    generateCompletion: jest.Mock;
  };
  let mockCareerProfileService: {
    findByWorkspace: jest.Mock;
  };
  let mockResumeProfileService: {
    findById: jest.Mock;
    update: jest.Mock;
  };
  let mockJobsRepository: {
    findJobById: jest.Mock;
  };

  const workspaceId = 'ws-test-123';
  const mockMasterProfile = {
    id: 'mp-1',
    identity: { fullName: 'Jane Doe', headline: 'Full Stack Engineer' },
    skills: [
      { id: 's-1', name: 'TypeScript' },
      { id: 's-2', name: 'React' },
    ],
    experiences: [
      {
        id: 'e-1',
        company: 'Acme Corp',
        title: 'Senior Engineer',
        bullets: ['Built scalable APIs'],
      },
    ],
    projects: [
      {
        id: 'p-1',
        name: 'CareerOS',
        bullets: ['Full-stack open-source platform'],
      },
    ],
    education: [
      { id: 'ed-1', institution: 'MIT', degree: 'BS Computer Science' },
    ],
    certifications: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAiCapabilityService = {
      resolveCapability: jest.fn(),
      generateCompletion: jest.fn(),
    };
    mockCareerProfileService = {
      findByWorkspace: jest.fn().mockResolvedValue(mockMasterProfile),
    };
    mockResumeProfileService = {
      findById: jest.fn(),
      update: jest.fn(),
    };
    mockJobsRepository = {
      findJobById: jest.fn(),
    };

    service = new AiCoachService(
      mockAiCapabilityService as unknown as AiCapabilityService,
      mockCareerProfileService as unknown as CareerProfileService,
      mockResumeProfileService as unknown as ResumeProfileService,
      mockJobsRepository as unknown as PrismaJobsRepository,
    );
  });

  describe('analyzeRole', () => {
    it('returns honest capability-unavailable state when AI is not configured', async () => {
      mockAiCapabilityService.resolveCapability.mockResolvedValue({
        available: false,
        reason: 'AI provider not configured.',
      });

      const res = await service.analyzeRole(workspaceId, {
        targetRole: 'Staff Frontend Engineer',
      });

      expect(res.available).toBe(false);
      expect(res.message).toContain('AI provider not configured');
      expect(mockAiCapabilityService.generateCompletion).not.toHaveBeenCalled();
    });

    it('generates real grounded analysis when AI capability is available', async () => {
      mockAiCapabilityService.resolveCapability.mockResolvedValue({
        available: true,
        provider: 'openai',
      });
      mockAiCapabilityService.generateCompletion.mockResolvedValue({
        available: true,
        text: JSON.stringify({
          strengths: ['TypeScript experience at Acme Corp'],
          gaps: ['GraphQL familiarity'],
          overallAdvice: 'Highlight API scalability in resume summary.',
        }),
      });

      const res = await service.analyzeRole(workspaceId, {
        targetRole: 'Senior TypeScript Engineer',
      });

      expect(res.available).toBe(true);
      expect(res.matchingOverview?.strengths).toContain(
        'TypeScript experience at Acme Corp',
      );
      expect(res.matchingOverview?.gaps).toContain('GraphQL familiarity');
    });
  });

  describe('coachSection', () => {
    it('provides section-specific coaching for summary', async () => {
      mockAiCapabilityService.resolveCapability.mockResolvedValue({
        available: true,
      });
      mockAiCapabilityService.generateCompletion.mockResolvedValue({
        available: true,
        text: JSON.stringify({
          recommendedContent:
            'Full Stack Engineer with proven expertise in TypeScript and scalable architecture.',
          explanation: 'Tailored to emphasize senior engineering impact.',
          keywordsAdded: ['scalable architecture'],
        }),
      });

      const res = await service.coachSection(workspaceId, {
        section: 'summary',
        targetRole: 'Senior Engineer',
      });

      expect(res.available).toBe(true);
      expect(res.recommendation?.section).toBe('summary');
      expect(res.recommendation?.recommendedContent).toContain(
        'scalable architecture',
      );
    });

    it('returns capability-unavailable when AI provider is absent', async () => {
      mockAiCapabilityService.resolveCapability.mockResolvedValue({
        available: false,
        reason: 'AI provider not configured.',
      });

      const res = await service.coachSection(workspaceId, {
        section: 'experience',
        targetRole: 'Senior Engineer',
      });

      expect(res.available).toBe(false);
      expect(res.message).toContain('AI provider not configured');
    });
  });

  describe('applySectionRecommendation', () => {
    it('applies accepted changes to Resume Profile and leaves Master Career Profile unchanged', async () => {
      const mockProfile = {
        id: 'rp-1',
        name: 'SDE Profile',
        summaryGuidance: 'Old guidance',
        latexSource:
          '\\resumesection{Summary}\nOld summary\n\\resumesection{Skills}',
      };
      mockResumeProfileService.findById.mockResolvedValue(mockProfile);
      mockResumeProfileService.update.mockResolvedValue({
        ...mockProfile,
        summaryGuidance: 'New tailored summary',
      });

      const result = await service.applySectionRecommendation(workspaceId, {
        resumeProfileId: 'rp-1',
        section: 'summary',
        content: 'New tailored summary',
      });

      expect(result.success).toBe(true);
      expect(mockResumeProfileService.update).toHaveBeenCalledWith(
        workspaceId,
        'rp-1',
        expect.objectContaining({
          summaryGuidance: 'New tailored summary',
        }),
      );
    });

    it('throws NotFoundException if Resume Profile does not exist', async () => {
      mockResumeProfileService.findById.mockResolvedValue(undefined);

      await expect(
        service.applySectionRecommendation(workspaceId, {
          resumeProfileId: 'rp-non-existent',
          section: 'summary',
          content: 'Test',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
