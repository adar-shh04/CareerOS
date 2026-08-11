import { Injectable } from '@nestjs/common';

import type { MasterCareerProfile } from '../career-profile/career-profile.types';
import type { ResumeProfile } from '../resume-profile/resume-profile.types';
import type { CanonicalJob, MatchInput, MatchOutput } from './jobs.types';
import { DEFAULT_WEIGHTS } from './jobs.types';

/**
 * JobMatchingService — deterministic, explainable job-to-profile matching.
 *
 * Design principles:
 * - Pure function: same inputs always produce the same output.
 * - No LLM calls. Reasoning derives directly from profile/job data.
 * - Scoring weights are fully configurable via the MatchInput; DEFAULT_WEIGHTS
 *   is the fallback.
 * - Uses both MasterCareerProfile and (optionally) ResumeProfile so that
 *   priority signals from a targeted profile can influence scores.
 */
@Injectable()
export class JobMatchingService {
  /**
   * Compute a match result for one job × profile combination.
   * Does NOT persist the result — callers decide when to store it.
   */
  match(input: MatchInput): MatchOutput {
    const {
      job,
      masterProfile,
      resumeProfile,
      weights = DEFAULT_WEIGHTS,
    } = input;

    const skillResult = this.scoreSkills(job, masterProfile, resumeProfile);
    const roleScore = this.scoreRole(job, masterProfile, resumeProfile);
    const experienceScore = this.scoreExperience(job, masterProfile);
    const locationScore = this.scoreLocation(job, masterProfile);
    const seniorityScore = this.scoreSeniority(job, masterProfile);

    const dimensionScores = {
      skill: skillResult.score,
      role: roleScore,
      experience: experienceScore,
      location: locationScore,
      seniority: seniorityScore,
    };

    // Weights are validated to be positive; we normalize just in case they
    // don't sum to exactly 1.0 due to floating-point drift.
    const totalWeight =
      weights.skill +
      weights.role +
      weights.experience +
      weights.location +
      weights.seniority;

    const overallScore =
      totalWeight > 0
        ? (dimensionScores.skill * weights.skill +
            dimensionScores.role * weights.role +
            dimensionScores.experience * weights.experience +
            dimensionScores.location * weights.location +
            dimensionScores.seniority * weights.seniority) /
          totalWeight
        : 0;

    const confidence = this.computeConfidence(masterProfile, job);
    const explanation = this.buildExplanation({
      job,
      masterProfile,
      overallScore,
      skillResult,
      roleScore,
      experienceScore,
      locationScore,
    });

    return {
      overallScore: Math.min(1, Math.max(0, overallScore)),
      dimensionScores,
      matchedSkills: skillResult.matched,
      missingSkills: skillResult.missing,
      matchedPreferredSkills: skillResult.matchedPreferred,
      confidence,
      explanation,
      evidence: {
        matchedSkills: skillResult.matched,
        missingSkills: skillResult.missing,
        matchedPreferredSkills: skillResult.matchedPreferred,
        profileSkillCount: skillResult.profileSkillCount,
        requiredSkillCount: job.requiredSkills.length,
        experienceYears: this.estimateExperienceYears(masterProfile),
      },
    };
  }

  // ── Dimension scorers ──────────────────────────────────────────────────

  private scoreSkills(
    job: CanonicalJob,
    profile: MasterCareerProfile,
    resumeProfile?: ResumeProfile,
  ): {
    score: number;
    matched: string[];
    missing: string[];
    matchedPreferred: string[];
    profileSkillCount: number;
  } {
    // Collect all skill names from skills + technologies in the master profile.
    const profileSkillNames = this.collectProfileSkillNames(profile);

    // If a ResumeProfile is supplied, boost skills that are priority-listed.
    const prioritySkillIds = new Set<string>(
      resumeProfile?.prioritySkillIds ?? [],
    );
    const prioritySkillNames = new Set<string>(
      profile.skills
        .filter((s) => prioritySkillIds.has(s.id))
        .map((s) => this.normalize(s.name)),
    );

    const normalizedProfileSkills = new Set(
      [...profileSkillNames].map(this.normalize),
    );

    const required = job.requiredSkills.map(this.normalize);
    const preferred = job.preferredSkills.map(this.normalize);

    const matched: string[] = [];
    const missing: string[] = [];

    for (const skill of required) {
      if (normalizedProfileSkills.has(skill)) {
        matched.push(skill);
      } else {
        // Partial substring match (e.g. "react" matches "react.js")
        const partial = [...normalizedProfileSkills].some(
          (p) => p.includes(skill) || skill.includes(p),
        );
        if (partial) {
          matched.push(skill);
        } else {
          missing.push(skill);
        }
      }
    }

    const matchedPreferred: string[] = [];
    for (const skill of preferred) {
      if (normalizedProfileSkills.has(skill)) {
        matchedPreferred.push(skill);
      }
    }

    const requiredCount = required.length;
    if (requiredCount === 0) {
      // No required skills listed — treat as neutral rather than full score.
      return {
        score: 0.5,
        matched,
        missing,
        matchedPreferred,
        profileSkillCount: profileSkillNames.size,
      };
    }

    let score = matched.length / requiredCount;

    // Small bonus for matching preferred skills (up to +0.1).
    if (preferred.length > 0) {
      const preferredBonus = (matchedPreferred.length / preferred.length) * 0.1;
      score = Math.min(1, score + preferredBonus);
    }

    // Priority skill boost: if a priority skill is matched, lift score slightly.
    const priorityMatched = matched.filter((m) => prioritySkillNames.has(m));
    if (priorityMatched.length > 0) {
      const boost = Math.min(
        0.05,
        (priorityMatched.length / requiredCount) * 0.1,
      );
      score = Math.min(1, score + boost);
    }

    return {
      score,
      matched,
      missing,
      matchedPreferred,
      profileSkillCount: profileSkillNames.size,
    };
  }

  private scoreRole(
    job: CanonicalJob,
    profile: MasterCareerProfile,
    resumeProfile?: ResumeProfile,
  ): number {
    const jobTitle = this.normalize(job.title);

    // Pull role signals: most recent experience titles + resume profile roleFocus.
    const roleSources: string[] = [
      ...(profile.experiences ?? []).map((e) => this.normalize(e.title)),
    ];

    if (resumeProfile?.roleFocus) {
      roleSources.unshift(this.normalize(resumeProfile.roleFocus));
    }

    if (roleSources.length === 0) return 0.3; // No role history — low signal.

    const jobTokens = this.tokenize(jobTitle);

    let bestScore = 0;
    for (const role of roleSources) {
      const roleTokens = this.tokenize(role);
      const overlap = jobTokens.filter((t) => roleTokens.includes(t)).length;
      const union = new Set([...jobTokens, ...roleTokens]).size;
      const jaccard = union > 0 ? overlap / union : 0;
      if (jaccard > bestScore) bestScore = jaccard;
    }

    // Give a floor of 0.2 so even unrelated titles aren't completely discarded
    // when other dimensions are strong.
    return Math.max(0.2, bestScore);
  }

  private scoreExperience(
    job: CanonicalJob,
    profile: MasterCareerProfile,
  ): number {
    const years = this.estimateExperienceYears(profile);

    // Attempt to read a seniority hint from the job title to calibrate.
    const title = this.normalize(job.title);
    let requiredYears = 2; // default assumption

    if (
      title.includes('staff') ||
      title.includes('principal') ||
      title.includes('distinguished')
    ) {
      requiredYears = 8;
    } else if (title.includes('senior') || title.includes('lead')) {
      requiredYears = 5;
    } else if (title.includes('junior') || title.includes('entry')) {
      requiredYears = 0;
    } else if (title.includes('mid') || title.includes('engineer ii')) {
      requiredYears = 3;
    }

    if (requiredYears === 0) return years > 0 ? 1.0 : 0.8;
    const ratio = years / requiredYears;
    // Cap at 1; also give partial credit below threshold.
    return Math.min(1, Math.max(0.2, ratio));
  }

  private scoreLocation(
    job: CanonicalJob,
    profile: MasterCareerProfile,
  ): number {
    // Remote job always scores 1 — location is irrelevant.
    if (job.isRemote || job.remotePolicy === 'REMOTE') return 1.0;

    const profileLocation = this.normalize(profile.identity?.location ?? '');
    const jobLocation = this.normalize(job.location);

    if (!profileLocation) return 0.5; // Unknown — neutral.

    // Exact match or job location mentions profile city/region.
    if (
      jobLocation.includes(profileLocation) ||
      profileLocation.includes(jobLocation)
    ) {
      return 1.0;
    }

    // Partial word overlap (e.g. "san francisco" vs "bay area, ca").
    const jobTokens = this.tokenize(jobLocation);
    const profileTokens = this.tokenize(profileLocation);
    const hasOverlap = jobTokens.some((t) => profileTokens.includes(t));
    if (hasOverlap) return 0.7;

    return 0.2; // Different locations, not remote.
  }

  private scoreSeniority(
    job: CanonicalJob,
    profile: MasterCareerProfile,
  ): number {
    const years = this.estimateExperienceYears(profile);
    const title = this.normalize(job.title);

    // Classify job seniority level.
    let jobLevel: number; // 0=entry, 1=mid, 2=senior, 3=staff/lead, 4=principal
    if (
      title.includes('principal') ||
      title.includes('distinguished') ||
      title.includes('fellow')
    ) {
      jobLevel = 4;
    } else if (
      title.includes('staff') ||
      title.includes('lead') ||
      title.includes('manager')
    ) {
      jobLevel = 3;
    } else if (title.includes('senior') || title.includes('sr.')) {
      jobLevel = 2;
    } else if (
      title.includes('junior') ||
      title.includes('jr.') ||
      title.includes('entry')
    ) {
      jobLevel = 0;
    } else {
      jobLevel = 1;
    }

    // Map years of experience to profile seniority level.
    let profileLevel: number;
    if (years >= 10) profileLevel = 4;
    else if (years >= 7) profileLevel = 3;
    else if (years >= 4) profileLevel = 2;
    else if (years >= 1) profileLevel = 1;
    else profileLevel = 0;

    const diff = Math.abs(jobLevel - profileLevel);
    if (diff === 0) return 1.0;
    if (diff === 1) return 0.75;
    if (diff === 2) return 0.4;
    return 0.1;
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private computeConfidence(
    profile: MasterCareerProfile,
    job: CanonicalJob,
  ): number {
    let score = 1.0;

    // Penalise when the profile has very few skills or experiences.
    const skillCount = this.collectProfileSkillNames(profile).size;
    if (skillCount === 0) score -= 0.3;
    else if (skillCount < 3) score -= 0.15;

    if ((profile.experiences?.length ?? 0) === 0) score -= 0.2;

    // Penalise when the job has no required skills listed.
    if (job.requiredSkills.length === 0) score -= 0.15;

    return Math.max(0.1, Math.min(1.0, score));
  }

  private buildExplanation(ctx: {
    job: CanonicalJob;
    masterProfile: MasterCareerProfile;
    overallScore: number;
    skillResult: {
      score: number;
      matched: string[];
      missing: string[];
      matchedPreferred: string[];
    };
    roleScore: number;
    experienceScore: number;
    locationScore: number;
  }): string {
    const pct = Math.round(ctx.overallScore * 100);
    const required = ctx.job.requiredSkills.length;
    const matched = ctx.skillResult.matched.length;
    const missing = ctx.skillResult.missing;

    const parts: string[] = [`${pct}/100 overall match score.`];

    if (required > 0) {
      parts.push(`${matched}/${required} required skills matched.`);
    }

    if (ctx.skillResult.matchedPreferred.length > 0) {
      parts.push(
        `Preferred skills matched: ${ctx.skillResult.matchedPreferred.slice(0, 3).join(', ')}.`,
      );
    }

    if (missing.length > 0) {
      parts.push(
        `Missing required skills: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? ', and more' : ''}.`,
      );
    }

    if (ctx.roleScore >= 0.6) {
      parts.push('Strong role/title alignment.');
    } else if (ctx.roleScore < 0.3) {
      parts.push('Limited role/title alignment with current experience.');
    }

    const years = this.estimateExperienceYears(ctx.masterProfile);
    if (years > 0) {
      parts.push(`~${years} years of estimated experience.`);
    }

    if (ctx.locationScore === 1.0) {
      parts.push(ctx.job.isRemote ? 'Remote position.' : 'Location match.');
    } else if (ctx.locationScore < 0.4) {
      parts.push(
        'Location may not align — consider relocation or remote options.',
      );
    }

    return parts.join(' ');
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
    // Accept "YYYY", "YYYY-MM", or "YYYY-MM-DD".
    const parts = dateStr.split('-');
    const year = parseInt(parts[0] ?? '', 10);
    const month = parseInt(parts[1] ?? '1', 10) - 1;
    if (isNaN(year)) return null;
    return new Date(year, isNaN(month) ? 0 : month, 1);
  }

  private collectProfileSkillNames(profile: MasterCareerProfile): Set<string> {
    const names = new Set<string>();
    (profile.skills ?? []).forEach((s) => names.add(s.name));
    (profile.technologies ?? []).forEach((t) => names.add(t.name));
    // Also pick up technologies listed on experiences and projects.
    (profile.experiences ?? []).forEach((e) => {
      (e.technologies ?? []).forEach((t) => names.add(t));
    });
    (profile.projects ?? []).forEach((p) => {
      (p.technologies ?? []).forEach((t) => names.add(t));
    });
    return names;
  }

  private normalize(str: string): string {
    return str.toLowerCase().trim();
  }

  private tokenize(str: string): string[] {
    return str
      .split(/[\s,./\\-]+/)
      .map((t) => t.trim())
      .filter(Boolean);
  }
}
