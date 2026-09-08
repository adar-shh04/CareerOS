import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { AiCapabilityService } from '../byok/ai-capability.service';
import { CareerProfileService } from '../career-profile/career-profile.service';
import { PrismaJobsRepository } from '../jobs/prisma-jobs.repository';
import { ResumeProfileService } from '../resume-profile/resume-profile.service';
import type {
  AiCoachAnalysisResponse,
  AiCoachSection,
  ApplySectionRecommendationRequest,
  SectionCoachingRequest,
  SectionRecommendation,
} from './ai-coach.types';

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
        message: completion.reason ?? 'AI Coach completion failed.',
        targetRole: jobTitle,
        company: jobCompany,
      };
    }

    try {
      const parsed = JSON.parse(completion.text) as {
        strengths?: string[];
        gaps?: string[];
        overallAdvice?: string;
      };
      return {
        available: true,
        targetRole: jobTitle,
        company: jobCompany,
        matchingOverview: {
          strengths: parsed.strengths ?? [],
          gaps: parsed.gaps ?? [],
          overallAdvice:
            parsed.overallAdvice ??
            'Review evidence and target role requirements.',
        },
      };
    } catch {
      return {
        available: true,
        targetRole: jobTitle,
        company: jobCompany,
        matchingOverview: {
          strengths: ['Relevant domain experience'],
          gaps: ['Review specific job requirements'],
          overallAdvice: completion.text,
        },
      };
    }
  }

  /**
   * Section-by-section Granular Coaching.
   * Operates on a single section (summary, experience, projects, skills, education)
   * grounded in Master Career Profile evidence.
   */
  async coachSection(
    workspaceId: string,
    req: SectionCoachingRequest,
  ): Promise<{
    available: boolean;
    message?: string;
    recommendation?: SectionRecommendation;
  }> {
    const masterProfile =
      await this.careerProfileService.findByWorkspace(workspaceId);
    if (!masterProfile) {
      throw new NotFoundException('Master Career Profile not found.');
    }

    const cap = await this.aiCapabilityService.resolveCapability(workspaceId);
    if (!cap.available) {
      return {
        available: false,
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
        message: completion.reason ?? 'Failed to generate section coaching.',
      };
    }

    try {
      const parsed = JSON.parse(completion.text) as {
        recommendedContent?: string;
        explanation?: string;
        keywordsAdded?: string[];
      };

      return {
        available: true,
        recommendation: {
          section: req.section,
          recommendedContent: parsed.recommendedContent ?? '',
          explanation:
            parsed.explanation ??
            'Section tailoring advice based on target role.',
          keywordsAdded: parsed.keywordsAdded ?? [],
        },
      };
    } catch {
      return {
        available: true,
        recommendation: {
          section: req.section,
          recommendedContent: completion.text,
          explanation: 'Tailored section recommendations.',
        },
      };
    }
  }

  /**
   * Apply accepted section recommendations.
   * Updates ONLY the target Resume Profile (preserving Master Career Profile truth).
   */
  async applySectionRecommendation(
    workspaceId: string,
    req: ApplySectionRecommendationRequest,
  ) {
    const profile = await this.resumeProfileService.findById(
      workspaceId,
      req.resumeProfileId,
    );
    if (!profile) {
      throw new NotFoundException('Resume Profile not found.');
    }

    const updatePayload = { ...profile };

    if (req.section === 'summary' && req.content) {
      updatePayload.summaryGuidance = req.content;
    } else if (req.section === 'skills' && req.selectedRecordIds) {
      updatePayload.prioritySkillIds = req.selectedRecordIds;
    } else if (req.section === 'projects' && req.selectedRecordIds) {
      updatePayload.priorityProjectIds = req.selectedRecordIds;
    } else if (req.section === 'experience' && req.selectedRecordIds) {
      updatePayload.priorityExperienceIds = req.selectedRecordIds;
    }

    // Apply content updates to LaTeX source if latexSource exists
    if (profile.latexSource && req.content) {
      updatePayload.latexSource = this.updateLatexSection(
        profile.latexSource,
        req.section,
        req.content,
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

  private updateLatexSection(
    latexSource: string,
    section: AiCoachSection,
    newContent: string,
  ): string {
    const sectionTitleMap: Record<AiCoachSection, string> = {
      summary: 'Summary',
      skills: 'Skills',
      experience: 'Experience',
      projects: 'Projects',
      education: 'Education',
    };
    const title = sectionTitleMap[section];
    if (!title) return latexSource;

    const regex = new RegExp(
      `(\\\\resumesection\\{${title}\\})[\\s\\S]*?(?=(\\\\resumesection|\\\\end\\{document\\}))`,
      'i',
    );
    if (regex.test(latexSource)) {
      return latexSource.replace(regex, `$1\n${newContent}\n\n`);
    }

    return latexSource;
  }
}
