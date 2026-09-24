import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  generateLatexFromProfile,
  LATEX_SECTION_TITLES,
  plainTextToLatex,
  updateLatexSection,
} from '@repo/types';

import { AiCapabilityService } from '../byok/ai-capability.service';
import { CareerProfileService } from '../career-profile/career-profile.service';
import { PrismaJobsRepository } from '../jobs/prisma-jobs.repository';
import {
  ResumeProfileService,
  ResumeProfileValidationError,
} from '../resume-profile/resume-profile.service';
import type {
  AiCoachAnalysisResponse,
  AiCoachSection,
  ApplySectionRecommendationRequest,
  SectionCoachingRequest,
  SectionCoachingResponse,
} from './ai-coach.types';
import {
  isNonEmptyString,
  isStringArray,
  parseAiJsonObject,
} from './ai-json.util';

@Injectable()
export class AiCoachService {
  private readonly logger = new Logger(AiCoachService.name);

  constructor(
    private readonly aiCapabilityService: AiCapabilityService,
    private readonly careerProfileService: CareerProfileService,
    private readonly resumeProfileService: ResumeProfileService,
    private readonly jobsRepository: PrismaJobsRepository,
  ) {}

  /**
   * Overall role analysis using AI Coach.
   * Grounded strictly in Master Career Profile evidence and Job Description.
   */
  async analyzeRole(
    workspaceId: string,
    params: { jobId?: string; targetRole?: string; resumeProfileId?: string },
  ): Promise<AiCoachAnalysisResponse> {
    const masterProfile =
      await this.careerProfileService.findByWorkspace(workspaceId);
    if (!masterProfile) {
      throw new NotFoundException(
        'Master Career Profile not found. Please complete your career profile first.',
      );
    }

    let jobTitle = params.targetRole ?? 'Target Role';
    let jobCompany = '';
    let jobDescription = '';

    if (params.jobId) {
      const job = await this.jobsRepository.findJobById(params.jobId);
      if (job) {
        jobTitle = job.title;
        jobCompany = job.company;
        jobDescription = job.description ?? '';
      }
    }

    // Resolve AI capability
    const cap = await this.aiCapabilityService.resolveCapability(workspaceId);
    if (!cap.available) {
      return {
        available: false,
        failureReason: 'not_configured',
        message:
          cap.reason ??
          'AI provider not configured. Connect BYOK or enable a CareerOS AI plan to use AI Coach.',
        targetRole: jobTitle,
        company: jobCompany,
      };
    }

    // Grounded evidence text
    const evidenceText = JSON.stringify({
      identity: masterProfile.identity,
      skills: masterProfile.skills.map((s) => s.name),
      experiences: masterProfile.experiences.map((e) => ({
        company: e.company,
        title: e.title,
        bullets: e.bullets,
      })),
      projects: masterProfile.projects.map((p) => ({
        name: p.name,
        bullets: p.bullets,
      })),
    });

    const systemPrompt = `You are an expert AI Career Coach for CareerOS.
Analyze the candidate's verified career evidence against the target role/job description.
IMPORTANT EVIDENCE RULES:
1. Ground your advice strictly in the candidate's verified experience. Do NOT invent new job titles, companies, or fake metrics.
2. Return ONLY a valid JSON object matching this schema:
{
  "strengths": ["string"],
  "gaps": ["string"],
  "overallAdvice": "string"
}`;

    const userPrompt = `Target Role: ${jobTitle} ${jobCompany ? `@ ${jobCompany}` : ''}
Job Description: ${jobDescription || 'N/A'}

Verified Candidate Evidence:
${evidenceText}`;

    const completion = await this.aiCapabilityService.generateCompletion(
      workspaceId,
      { systemPrompt, userPrompt, temperature: 0.2 },
    );

    if (!completion.available || !completion.text) {
      return {
        available: false,
        failureReason: completion.failureReason ?? 'provider_error',
        message: completion.reason ?? 'AI Coach completion failed.',
        targetRole: jobTitle,
        company: jobCompany,
      };
    }

    // AI output is untrusted: accept it only if it matches the requested schema.
    const parsed = parseAiJsonObject(completion.text);
    if (
      !parsed ||
      !isStringArray(parsed.strengths) ||
      !isStringArray(parsed.gaps) ||
      !isNonEmptyString(parsed.overallAdvice)
    ) {
      this.logger.warn(
        `AI Coach analysis for workspace ${workspaceId} returned an invalid response.`,
      );
      return {
        available: false,
        failureReason: 'invalid_response',
        message:
          'The AI provider returned a response that could not be validated, so no analysis is shown. Try again.',
        targetRole: jobTitle,
        company: jobCompany,
      };
    }

    return {
      available: true,
      targetRole: jobTitle,
      company: jobCompany,
      matchingOverview: {
        strengths: parsed.strengths,
        gaps: parsed.gaps,
        overallAdvice: parsed.overallAdvice.trim(),
      },
    };
  }

  /**
   * Section-by-section Granular Coaching.
   * Operates on a single section (summary, experience, projects, skills, education)
   * grounded in Master Career Profile evidence.
   */
  async coachSection(
    workspaceId: string,
    req: SectionCoachingRequest,
  ): Promise<SectionCoachingResponse> {
    if (!(req.section in LATEX_SECTION_TITLES)) {
      throw new BadRequestException(`Unsupported section "${req.section}".`);
    }

    const masterProfile =
      await this.careerProfileService.findByWorkspace(workspaceId);
    if (!masterProfile) {
      throw new NotFoundException('Master Career Profile not found.');
    }

    const cap = await this.aiCapabilityService.resolveCapability(workspaceId);
    if (!cap.available) {
      return {
        available: false,
        failureReason: 'not_configured',
        message:
          cap.reason ??
          'AI provider not configured. Connect BYOK or enable a CareerOS AI plan to use AI Coach.',
      };
    }

    let jobTitle = req.targetRole ?? 'Target Role';
    let jobDescription = '';
    if (req.jobId) {
      const job = await this.jobsRepository.findJobById(req.jobId);
      if (job) {
        jobTitle = job.title;
        jobDescription = job.description ?? '';
      }
    }

    const sectionEvidence = this.extractSectionEvidence(
      masterProfile,
      req.section,
    );

    const systemPrompt = `You are an expert AI Resume Coach. Provide granular tailoring advice ONLY for the "${req.section}" section of the resume.
CRITICAL RULES:
1. Do NOT invent fake experience or claims. Base all suggestions on the provided evidence.
2. Return ONLY a valid JSON object matching this schema:
{
  "recommendedContent": "string",
  "explanation": "string",
  "keywordsAdded": ["string"]
}`;

    const userPrompt = `Target Role: ${jobTitle}
Job Description Snippet: ${jobDescription.slice(0, 500)}

Candidate Evidence for ${req.section}:
${JSON.stringify(sectionEvidence, null, 2)}`;

    const completion = await this.aiCapabilityService.generateCompletion(
      workspaceId,
      { systemPrompt, userPrompt, temperature: 0.2 },
    );

    if (!completion.available || !completion.text) {
      return {
        available: false,
        failureReason: completion.failureReason ?? 'provider_error',
        message: completion.reason ?? 'Failed to generate section coaching.',
      };
    }

    // AI output is untrusted: accept it only if it matches the requested schema.
    const parsed = parseAiJsonObject(completion.text);
    if (
      !parsed ||
      !isNonEmptyString(parsed.recommendedContent) ||
      !isNonEmptyString(parsed.explanation) ||
      (parsed.keywordsAdded !== undefined &&
        !isStringArray(parsed.keywordsAdded))
    ) {
      this.logger.warn(
        `AI Coach section "${req.section}" for workspace ${workspaceId} returned an invalid response.`,
      );
      return {
        available: false,
        failureReason: 'invalid_response',
        message:
          'The AI provider returned a response that could not be validated, so no recommendation is shown. Try again.',
      };
    }

    return {
      available: true,
      recommendation: {
        section: req.section,
        recommendedContent: parsed.recommendedContent.trim(),
        explanation: parsed.explanation.trim(),
        keywordsAdded: parsed.keywordsAdded ?? [],
      },
    };
  }

  /**
   * Apply accepted section recommendations.
   * Updates ONLY the target Resume Profile (preserving Master Career Profile truth).
   */
  async applySectionRecommendation(
    workspaceId: string,
    req: ApplySectionRecommendationRequest,
  ) {
    if (!(req.section in LATEX_SECTION_TITLES)) {
      throw new BadRequestException(`Unsupported section "${req.section}".`);
    }
    const content = req.content?.trim();
    if (!content && !req.selectedRecordIds) {
      throw new BadRequestException(
        'Nothing to apply: provide content or selectedRecordIds.',
      );
    }

    let profile: Awaited<ReturnType<ResumeProfileService['findById']>>;
    try {
      profile = await this.resumeProfileService.findById(
        workspaceId,
        req.resumeProfileId,
      );
    } catch (error) {
      if (!(error instanceof ResumeProfileValidationError)) throw error;
    }
    if (!profile) {
      throw new NotFoundException('Resume Profile not found.');
    }

    const updatePayload = { ...profile };

    if (req.section === 'summary' && content) {
      updatePayload.summaryGuidance = content;
    } else if (req.section === 'skills' && req.selectedRecordIds) {
      updatePayload.prioritySkillIds = req.selectedRecordIds;
    } else if (req.section === 'projects' && req.selectedRecordIds) {
      updatePayload.priorityProjectIds = req.selectedRecordIds;
    } else if (req.section === 'experience' && req.selectedRecordIds) {
      updatePayload.priorityExperienceIds = req.selectedRecordIds;
    }

    // Accepted content is written into the profile's own LaTeX section (the
    // shared CareerOS LaTeX contract), escaped as plain text. A profile with no
    // stored source first gets the canonical document for its master profile.
    if (content) {
      let baseLatex = profile.latexSource;
      if (!baseLatex) {
        const masterProfile =
          await this.careerProfileService.findByWorkspace(workspaceId);
        if (!masterProfile) {
          throw new NotFoundException('Master Career Profile not found.');
        }
        baseLatex = generateLatexFromProfile(masterProfile, updatePayload);
      }
      updatePayload.latexSource = updateLatexSection(
        baseLatex,
        LATEX_SECTION_TITLES[req.section],
        plainTextToLatex(content),
      );
    }

    const updated = await this.resumeProfileService.update(
      workspaceId,
      req.resumeProfileId,
      updatePayload,
    );

    return {
      success: true,
      message: `Accepted changes applied to Resume Profile "${updated.name}" for section "${req.section}". Master Career Profile remains unchanged.`,
      profile: updated,
    };
  }

  private extractSectionEvidence(
    masterProfile: Awaited<ReturnType<CareerProfileService['findByWorkspace']>>,
    section: AiCoachSection,
  ): unknown {
    if (!masterProfile) return {};
    switch (section) {
      case 'summary':
        return masterProfile.identity;
      case 'skills':
        return masterProfile.skills;
      case 'experience':
        return masterProfile.experiences;
      case 'projects':
        return masterProfile.projects;
      case 'education':
        return masterProfile.education;
      default:
        return masterProfile;
    }
  }
}
