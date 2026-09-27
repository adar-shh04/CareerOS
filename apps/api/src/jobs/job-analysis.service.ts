import { Injectable } from '@nestjs/common';
import type {
  CanonicalJob,
  JobAnalysisResult,
  ResumeSection,
} from '@repo/types';

import type { MatchOutput } from './jobs.types';
import { resolveJobRequirements } from './seniority';

/**
 * Structured job analysis derived from a deterministic match. Every skill
 * classification comes from the matcher (canonical skill identity), so the
 * analysis and the match can never disagree about what the profile has.
 */
@Injectable()
export class JobAnalysisService {
  analyze(
    job: CanonicalJob,
    match: Pick<
      MatchOutput,
      | 'matchedSkills'
      | 'missingSkills'
      | 'matchedPreferredSkills'
      | 'missingPreferredSkills'
      | 'dimensionScores'
      | 'evidence'
    >,
  ): JobAnalysisResult {
    const requiredCount =
      match.matchedSkills.length + match.missingSkills.length;
    const skillMatchPercentage =
      requiredCount > 0
        ? Math.round((match.matchedSkills.length / requiredCount) * 100)
        : Math.round(match.dimensionScores.skill * 100);

    const requirements = resolveJobRequirements(job);
    const profileYears = match.evidence.experienceYears;
    const requirementText =
      job.experienceRequirements?.text ??
      (requirements.requiredYears !== undefined
        ? `${String(requirements.requiredYears)}+ years`
        : undefined);

    let seniorityAlignment: JobAnalysisResult['gaps']['seniorityAlignment'];
    let experienceGap: string;
    if (requirements.requiredYears === undefined) {
      seniorityAlignment = 'unknown';
      experienceGap =
        'The posting does not state a years-of-experience requirement.';
    } else if (profileYears < requirements.requiredYears) {
      seniorityAlignment = 'under_qualified';
      experienceGap = `Job specifies ${requirementText ?? ''}, profile has ~${String(profileYears)} years.`;
    } else if (
      profileYears >
      (job.experienceRequirements?.maxYears ?? requirements.requiredYears + 5)
    ) {
      seniorityAlignment = 'over_qualified';
      experienceGap = `Profile has ~${String(profileYears)} years of experience, exceeding requirement of ${requirementText ?? ''}.`;
    } else {
      seniorityAlignment = 'aligned';
      experienceGap = `Experience aligned (~${String(profileYears)} years vs ${requirementText ?? ''} required).`;
    }

    // Only skills the profile actually has are recommended for emphasis;
    // missing skills are reported as gaps, never as focus areas.
    const prioritySkillNames = [
      ...match.matchedSkills,
      ...match.matchedPreferredSkills,
    ];

    const recommendedSectionOrder: ResumeSection[] = [
      'identity',
      'summary',
      'experience',
      'skills',
      'projects',
      'education',
      'certifications',
      'links',
    ];

    const suggestedFocus =
      prioritySkillNames.length > 0
        ? `Emphasize your evidence for ${prioritySkillNames.slice(0, 4).join(', ')}, which ${job.title} at ${job.company} lists.`
        : `None of the skills ${job.title} at ${job.company} lists are in your Master Career Profile yet; review the gaps before tailoring.`;

    return {
      jobId: job.id,
      role: job.title,
      seniority: requirements.seniority ?? 'Not specified',
      senioritySource: requirements.senioritySource,
      experienceRequirements: job.experienceRequirements,
      locationPolicy: {
        location: job.location,
        isRemote: job.isRemote,
        remotePolicy: job.remotePolicy,
      },
      skills: {
        requiredSkills: job.requiredSkills,
        preferredSkills: job.preferredSkills,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        matchedPreferredSkills: match.matchedPreferredSkills,
        skillMatchPercentage,
      },
      gaps: {
        missingRequiredSkills: match.missingSkills,
        missingPreferredSkills: match.missingPreferredSkills,
        experienceGap,
        seniorityAlignment,
      },
      targetingRecommendations: {
        prioritySkillNames,
        recommendedSectionOrder,
        suggestedFocus,
      },
      analyzedAt: new Date().toISOString(),
    };
  }
}
