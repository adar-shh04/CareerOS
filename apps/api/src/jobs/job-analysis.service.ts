import { Injectable } from '@nestjs/common';
import type {
  CanonicalJob,
  JobAnalysisResult,
  JobMatchResult,
  ResumeSection,
} from '@repo/types';

import type { MasterCareerProfile } from '../career-profile/career-profile.types';

@Injectable()
export class JobAnalysisService {
  analyze(
    job: CanonicalJob,
    match: Pick<
      JobMatchResult,
      | 'matchedSkills'
      | 'missingSkills'
      | 'dimensionScores'
      | 'confidence'
      | 'explanation'
    >,
    masterProfile: MasterCareerProfile,
  ): JobAnalysisResult {
    const matchedSkillsSet = new Set(
      match.matchedSkills.map((s) => s.toLowerCase()),
    );

    const missingRequiredSkills = (job.requiredSkills ?? []).filter(
      (s) => !matchedSkillsSet.has(s.toLowerCase()),
    );

    const missingPreferredSkills = (job.preferredSkills ?? []).filter(
      (s) => !matchedSkillsSet.has(s.toLowerCase()),
    );

    const totalRequired = job.requiredSkills?.length ?? 0;
    const matchedCount = match.matchedSkills.length;
    const skillMatchPercentage =
      totalRequired > 0
        ? Math.round((matchedCount / totalRequired) * 100)
        : Math.round(match.dimensionScores.skill * 100);

    const profileYears = this.estimateExperienceYears(masterProfile);
    const reqMinYears = job.experienceRequirements?.minYears ?? 2;

    let seniorityAlignment: 'aligned' | 'under_qualified' | 'over_qualified' =
      'aligned';
    let experienceGap: string | undefined;

    if (profileYears < reqMinYears) {
      seniorityAlignment = 'under_qualified';
      experienceGap = `Job specifies ${job.experienceRequirements?.text ?? `${reqMinYears}+ years`}, profile has ~${profileYears} years.`;
    } else if (profileYears > reqMinYears + 5) {
      seniorityAlignment = 'over_qualified';
      experienceGap = `Profile has ~${profileYears} years of experience, exceeding requirement of ${job.experienceRequirements?.text ?? `${reqMinYears} years`}.`;
    } else {
      experienceGap = `Experience aligned (~${profileYears} years vs ${job.experienceRequirements?.text ?? `${reqMinYears}+ years`} required).`;
    }

    const prioritySkillNames = Array.from(
      new Set([
        ...match.matchedSkills,
        ...(job.requiredSkills ?? []).slice(0, 5),
      ]),
    );

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

    const suggestedFocus = `Emphasize key competencies in ${prioritySkillNames.slice(0, 4).join(', ')} matching ${job.title} at ${job.company}.`;

    return {
      jobId: job.id,
      role: job.title,
      seniority: job.seniority ?? 'Mid',
      experienceRequirements: job.experienceRequirements,
      locationPolicy: {
        location: job.location,
        isRemote: job.isRemote,
        remotePolicy: job.remotePolicy,
      },
      skills: {
        requiredSkills: job.requiredSkills ?? [],
        preferredSkills: job.preferredSkills ?? [],
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        skillMatchPercentage,
      },
      gaps: {
        missingRequiredSkills,
        missingPreferredSkills,
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

  private estimateExperienceYears(profile: MasterCareerProfile): number {
    const experiences = profile.experiences ?? [];
    let totalMonths = 0;

    for (const exp of experiences) {
      const start = this.parseYearMonth(exp.startDate);
      const end = exp.current ? new Date() : this.parseYearMonth(exp.endDate);

      if (start && end && end >= start) {
        const months =
          (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth());
        totalMonths += months;
      }
    }

    return Math.max(0, Math.round(totalMonths / 12));
  }

  private parseYearMonth(dateStr?: string): Date | null {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    const year = parseInt(parts[0] ?? '', 10);
    const month = parseInt(parts[1] ?? '1', 10) - 1;
    if (isNaN(year)) return null;
    return new Date(year, isNaN(month) ? 0 : month, 1);
  }
}
