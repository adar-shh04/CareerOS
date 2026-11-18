import type {
  EvidenceReference,
  JobKeywordCoverage,
  KeywordCoverageStatus,
  KeywordCoverageSummary,
  KeywordCoverageTerm,
} from '@repo/types';

import type { MasterCareerProfile } from '../career-profile/career-profile.types';
import type { ResumeProfile } from '../resume-profile/resume-profile.types';
import type { CanonicalJob } from './jobs.types';
import { skillDisplayName, skillGroup } from './skill-categories';
import { canonicalSkillKey } from './skill-identity';

/**
 * Deterministic job keyword coverage: for each skill a posting lists, which
 * records of the Master Career Profile support it.
 *
 * Rules (shared with the matcher, so the two cannot disagree):
 * - Terms are compared by canonical skill identity, never by substring.
 * - Evidence is a reference to an existing record (skill, technology,
 *   experience or project). Nothing is inferred from free text, so a term that
 *   only appears inside a bullet sentence is not claimed as evidence.
 * - A term backed only by the skills/technologies lists is `listed_only`: the
 *   claim exists but no experience or project supports it, and the report says
 *   so instead of counting it as proven.
 * - A term the profile lacks is `missing`: a gap to report, never something
 *   to invent.
 * - Required and preferred are reported separately, and a preferred term that
 *   the posting also requires counts as required only.
 *
 * Pure: same inputs, same output. No I/O, no AI.
 */
export function buildKeywordCoverage(
  job: Pick<CanonicalJob, 'requiredSkills' | 'preferredSkills'>,
  profile: MasterCareerProfile,
  resumeProfile?: ResumeProfile,
): JobKeywordCoverage {
  const evidenceByKey = indexEvidence(profile);

  const selected = resumeProfile
    ? {
        skill: new Set(resumeProfile.prioritySkillIds),
        experience: new Set(resumeProfile.priorityExperienceIds),
        project: new Set(resumeProfile.priorityProjectIds),
      }
    : undefined;

  const required = uniqueBySkillIdentity(job.requiredSkills);
  const requiredKeys = new Set(required.map(canonicalSkillKey));
  const preferred = uniqueBySkillIdentity(job.preferredSkills).filter(
    (skill) => !requiredKeys.has(canonicalSkillKey(skill)),
  );

  const toTerm = (
    skill: string,
    importance: 'required' | 'preferred',
  ): KeywordCoverageTerm => {
    const key = canonicalSkillKey(skill);
    const evidence = evidenceByKey.get(key) ?? [];
    const status = statusOf(evidence);
    return {
      term: skillDisplayName(skill),
      key,
      importance,
      group: skillGroup(skill),
      status,
      evidence,
      // Only meaningful when there is evidence and a resume profile to compare.
      ...(selected && status !== 'missing'
        ? {
            selectedForResume: evidence.some((ref) =>
              isSelected(ref, selected),
            ),
          }
        : {}),
    };
  };

  const terms = [
    ...required.map((skill) => toTerm(skill, 'required')),
    ...preferred.map((skill) => toTerm(skill, 'preferred')),
  ];

  return {
    required: summarize(terms.filter((t) => t.importance === 'required')),
    preferred: summarize(terms.filter((t) => t.importance === 'preferred')),
    terms,
  };
}

function statusOf(evidence: EvidenceReference[]): KeywordCoverageStatus {
  if (
    evidence.some((ref) => ref.kind === 'experience' || ref.kind === 'project')
  ) {
    return 'evidenced';
  }
  return evidence.length > 0 ? 'listed_only' : 'missing';
}

function summarize(terms: KeywordCoverageTerm[]): KeywordCoverageSummary {
  const evidenced = terms.filter((t) => t.status === 'evidenced').length;
  const listedOnly = terms.filter((t) => t.status === 'listed_only').length;
  const matched = evidenced + listedOnly;
  return {
    total: terms.length,
    matched,
    evidenced,
    listedOnly,
    missing: terms.length - matched,
    percent:
      terms.length > 0 ? Math.round((matched / terms.length) * 100) : null,
  };
}

function isSelected(
  ref: EvidenceReference,
  selected: {
    skill: Set<string>;
    experience: Set<string>;
    project: Set<string>;
  },
): boolean {
  if (ref.kind === 'skill') return selected.skill.has(ref.recordId);
  if (ref.kind === 'experience') return selected.experience.has(ref.recordId);
  if (ref.kind === 'project') return selected.project.has(ref.recordId);
  return false; // technology entries have no selection list
}

/**
 * canonical key -> every profile record that lists it. Strongest evidence
 * first (experiences, then projects, then the skills and technologies lists),
 * in profile order, with one reference per record.
 */
function indexEvidence(
  profile: MasterCareerProfile,
): Map<string, EvidenceReference[]> {
  const index = new Map<string, EvidenceReference[]>();
  const add = (name: string, ref: EvidenceReference) => {
    const key = canonicalSkillKey(name);
    if (!key) return;
    const refs = index.get(key) ?? [];
    if (!refs.some((r) => r.kind === ref.kind && r.recordId === ref.recordId)) {
      refs.push(ref);
    }
    index.set(key, refs);
  };

  for (const experience of profile.experiences) {
    for (const tech of experience.technologies ?? []) {
      add(tech, {
        kind: 'experience',
        recordId: experience.id,
        label: `${experience.title} at ${experience.company}`,
      });
    }
  }
  for (const project of profile.projects) {
    for (const tech of project.technologies ?? []) {
      add(tech, { kind: 'project', recordId: project.id, label: project.name });
    }
  }
  for (const skill of profile.skills) {
    add(skill.name, { kind: 'skill', recordId: skill.id, label: skill.name });
  }
  for (const technology of profile.technologies) {
    add(technology.name, {
      kind: 'technology',
      recordId: technology.id,
      label: technology.name,
    });
  }
  return index;
}

/** One entry per canonical skill identity, keeping the posting's own order. */
function uniqueBySkillIdentity(skills: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const skill of skills) {
    const trimmed = skill.trim();
    const key = canonicalSkillKey(trimmed);
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}
