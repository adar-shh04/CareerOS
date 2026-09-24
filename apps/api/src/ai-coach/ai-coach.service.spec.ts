import { BadRequestException, NotFoundException } from '@nestjs/common';

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

    it('accepts valid JSON wrapped in a ```json fence', async () => {
      mockAiCapabilityService.resolveCapability.mockResolvedValue({
        available: true,
      });
      mockAiCapabilityService.generateCompletion.mockResolvedValue({
        available: true,
        text:
          '```json\n' +
          JSON.stringify({
            strengths: ['Built scalable APIs at Acme Corp'],
            gaps: [],
            overallAdvice: 'Lead with the API work.',
          }) +
          '\n```',
      });

      const res = await service.analyzeRole(workspaceId, {});
      expect(res.available).toBe(true);
      expect(res.matchingOverview?.strengths).toEqual([
        'Built scalable APIs at Acme Corp',
      ]);
    });

    it.each([
      [
        'non-JSON prose',
        'You are a great fit with relevant domain experience!',
      ],
      ['JSON missing fields', JSON.stringify({ strengths: ['x'] })],
      [
        'JSON with wrong types',
        JSON.stringify({ strengths: 'x', gaps: [], overallAdvice: 'y' }),
      ],
      [
        'empty advice',
        JSON.stringify({ strengths: [], gaps: [], overallAdvice: '  ' }),
      ],
    ])(
      'malformed AI output (%s) → explicit invalid_response, no fabricated evidence',
      async (_label, text) => {
        mockAiCapabilityService.resolveCapability.mockResolvedValue({
          available: true,
        });
        mockAiCapabilityService.generateCompletion.mockResolvedValue({
          available: true,
          text,
        });

        const res = await service.analyzeRole(workspaceId, {});

        expect(res.available).toBe(false);
        expect(res.failureReason).toBe('invalid_response');
        expect(res.matchingOverview).toBeUndefined();
        expect(JSON.stringify(res)).not.toContain('Relevant domain experience');
      },
    );

    it('provider failure → unavailable with provider_error', async () => {
      mockAiCapabilityService.resolveCapability.mockResolvedValue({
        available: true,
      });
      mockAiCapabilityService.generateCompletion.mockResolvedValue({
        available: false,
        failureReason: 'provider_error',
        reason: 'AI provider call failed: HTTP 500',
      });

      const res = await service.analyzeRole(workspaceId, {});
      expect(res.available).toBe(false);
      expect(res.failureReason).toBe('provider_error');
      expect(res.matchingOverview).toBeUndefined();
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
      expect(res.failureReason).toBe('not_configured');
    });

    it('malformed AI output → invalid_response, raw text is not returned as a recommendation', async () => {
      mockAiCapabilityService.resolveCapability.mockResolvedValue({
        available: true,
      });
      mockAiCapabilityService.generateCompletion.mockResolvedValue({
        available: true,
        text: 'Led a team of 40 engineers and grew revenue 300%.',
      });

      const res = await service.coachSection(workspaceId, {
        section: 'experience',
      });

      expect(res.available).toBe(false);
      expect(res.failureReason).toBe('invalid_response');
      expect(res.recommendation).toBeUndefined();
    });

    it('rejects an unsupported section before calling AI', async () => {
      await expect(
        service.coachSection(workspaceId, { section: 'hobbies' as never }),
      ).rejects.toThrow(BadRequestException);
      expect(mockAiCapabilityService.generateCompletion).not.toHaveBeenCalled();
    });
  });

  describe('applySectionRecommendation', () => {
    it('writes escaped content into the matching section of the stored LaTeX', async () => {
      const latexSource = [
        '\\documentclass{article}',
        '\\begin{document}',
        '\\header{Summary}',
        'Old summary',
        '\\header{Skills}',
        'TypeScript',
        '\\end{document}',
      ].join('\n');
      mockResumeProfileService.findById.mockResolvedValue({
        id: 'rp-1',
        name: 'SDE Profile',
        latexSource,
      });
      mockResumeProfileService.update.mockImplementation(
        (_ws: string, _id: string, input: object) =>
          Promise.resolve({ name: 'SDE Profile', ...input }),
      );

      await service.applySectionRecommendation(workspaceId, {
        resumeProfileId: 'rp-1',
        section: 'summary',
        content: 'Engineer shipping R&D tools at 100% uptime',
      });

      const saved = (
        mockResumeProfileService.update.mock.calls[0] as [
          string,
          string,
          { latexSource: string },
        ]
      )[2].latexSource;
      expect(saved).toContain(
        '\\header{Summary}\nEngineer shipping R\\&D tools at 100\\% uptime\n',
      );
      expect(saved).not.toContain('Old summary');
      expect(saved).toContain('\\header{Skills}\nTypeScript');
    });

    it('rejects a request with nothing to apply', async () => {
      await expect(
        service.applySectionRecommendation(workspaceId, {
          resumeProfileId: 'rp-1',
          section: 'summary',
        }),
      ).rejects.toThrow(BadRequestException);
    });

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
