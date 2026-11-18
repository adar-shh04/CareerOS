import type {
  JobKeywordCoverage,
  ResumeSelectionReview,
  ResumeVersion,
  SelectedRecordIds,
  SelectionReviewDocumentStatus,
  SelectionReviewRecord,
  SelectionReviewSection,
  SelectionReviewSectionKind,
} from '@repo/types';

import { buildKeywordCoverage } from '../jobs/keyword-coverage';
import { canonicalSkillKey } from '../jobs/skill-identity';
import { emptySelection } from './resume-version-document';

/**
 * Deterministic selection review for one resume version (T-04), built ONLY from
 * the version's own data: its frozen profile snapshot, its stored selection,
 * its stored document and the job analysis it was created with. It never reads
 * the current Resume Profile, the current Master Profile or a stored match, so
 * it cannot show stale state as current.
 *
 * Recommendation rules (every one comes with a plain-language reason):
 * - experiences: relevant when they list a keyword of the posting. Never
 *   recommended for removal: dropping one leaves a gap in the work history, so
 *   an experience with no signal is kept and flagged.
 * - projects: relevant when they list a keyword; otherwise a reason to leave out.
 * - skills: relevant when the skill is a keyword of the posting; otherwise kept.
 * - certifications: relevant when the name is a keyword; otherwise kept.
 * - achievements carry no technology data, so there is never a signal.
 * Nothing is invented: a keyword the profile lacks produces no record.
 */

const KINDS: {
  kind: SelectionReviewSectionKind;
  label: string;
  field: keyof SelectedRecordIds;
  renderedByTemplate: boolean;
}[] = [
  {
    kind: 'experiences',
    label: 'Experience',
    field: 'experienceIds',
    renderedByTemplate: true,
  },
  {
    kind: 'projects',
    label: 'Projects',
    field: 'projectIds',
    renderedByTemplate: true,
  },
  {
    kind: 'skills',
    label: 'Skills',
    field: 'skillIds',
    renderedByTemplate: true,
  },
  {
    kind: 'certifications',
    label: 'Certifications',
    field: 'certificationIds',
    renderedByTemplate: true,
  },
  {
    kind: 'achievements',
    label: 'Achievements',
    field: 'achievementIds',
    renderedByTemplate: false,
  },
];

interface TermMatch {
  term: string;
  importance: 'required' | 'preferred';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

/** Job keywords the version was created for, parsed defensively from its stored analysis. */
export function jobTermsOf(version: ResumeVersion): {
  requiredSkills: string[];
  preferredSkills: string[];
} {
  const skills = isRecord(version.jobAnalysisEvidence)
    ? version.jobAnalysisEvidence.skills
    : undefined;
  return {
    requiredSkills: isRecord(skills) ? stringList(skills.requiredSkills) : [],
    preferredSkills: isRecord(skills) ? stringList(skills.preferredSkills) : [],
  };
}

function termsByRecord(coverage: JobKeywordCoverage): Map<string, TermMatch[]> {
  const byRecord = new Map<string, TermMatch[]>();
  for (const term of coverage.terms) {
    for (const ref of term.evidence) {
      if (ref.kind === 'technology') continue; // not a selectable record
      const key = `${ref.kind}:${ref.recordId}`;
      const list = byRecord.get(key) ?? [];
      list.push({ term: term.term, importance: term.importance });
      byRecord.set(key, list);
    }
  }
  return byRecord;
}

const describeTerms = (terms: TermMatch[]) =>
  terms.map((t) => `${t.term} (${t.importance})`).join(', ');

export function buildSelectionReview(
  version: ResumeVersion,
): ResumeSelectionReview {
  const snapshot = version.masterProfileSnapshot;
  const document = version.document;
  const mode = document?.selectionMode ?? 'prioritized';

  const jobTerms = jobTermsOf(version);
  const coverage = buildKeywordCoverage(jobTerms, snapshot);
  const recommendationsAvailable = coverage.terms.length > 0;
  const byRecord = termsByRecord(coverage);
  const termKeys = new Map(coverage.terms.map((t) => [t.key, t]));

  const selected: SelectedRecordIds = {
    ...emptySelection(),
    ...version.selectedRecordIds,
  };
  const represented = document?.representedRecordIds;

  const record = (
    kind: SelectionReviewSectionKind,
    field: keyof SelectedRecordIds,
    renderedByTemplate: boolean,
    id: string,
    label: string,
    detail: string | undefined,
    matches: TermMatch[],
    certificateOrSkillMatch?: TermMatch[],
  ): SelectionReviewRecord => {
    const isSelected = selected[field].includes(id);
    const included =
      mode === 'included' || !renderedByTemplate ? isSelected : true;
    const terms = certificateOrSkillMatch ?? matches;

    let recommended: boolean | null = null;
    let reasons: string[] = [];
    if (recommendationsAvailable) {
      if (terms.length > 0) {
        recommended = true;
        reasons = [
          `Lists keywords from this posting: ${describeTerms(terms)}.`,
        ];
      } else if (kind === 'projects') {
        recommended = false;
        reasons = ["Lists none of this posting's keywords."];
      } else if (kind === 'experiences') {
        reasons = [
          "Lists none of this posting's keywords. Kept so your work history has no gap; remove it only if you want a shorter resume.",
        ];
      } else if (kind === 'achievements') {
        reasons = [
          'Achievements carry no technology data, so there is no keyword signal for this posting.',
        ];
      } else {
        reasons = ['Not a keyword of this posting; kept.'];
      }
    }

    return {
      id,
      label,
      ...(detail ? { detail } : {}),
      included,
      prioritized: mode === 'prioritized' && renderedByTemplate && isSelected,
      recommended,
      reasons,
      matchedTerms: terms,
      representedInDocument: !renderedByTemplate
        ? document?.kind === 'generated'
          ? false
          : null
        : represented
          ? represented[field].includes(id)
          : null,
    };
  };

  const dates = (start?: string, end?: string, current?: boolean) =>
    [start, current ? 'Present' : end].filter(Boolean).join(' – ') || undefined;

  const sections: SelectionReviewSection[] = KINDS.map(
    ({ kind, label, field, renderedByTemplate }) => {
      let records: SelectionReviewRecord[] = [];
      if (kind === 'experiences') {
        records = snapshot.experiences.map((e) =>
          record(
            kind,
            field,
            renderedByTemplate,
            e.id,
            `${e.title} at ${e.company}`,
            dates(e.startDate, e.endDate, e.current),
            byRecord.get(`experience:${e.id}`) ?? [],
          ),
        );
      } else if (kind === 'projects') {
        records = snapshot.projects.map((p) =>
          record(
            kind,
            field,
            renderedByTemplate,
            p.id,
            p.name,
            (p.technologies ?? []).slice(0, 5).join(', ') || undefined,
            byRecord.get(`project:${p.id}`) ?? [],
          ),
        );
      } else if (kind === 'skills') {
        records = snapshot.skills.map((s) =>
          record(
            kind,
            field,
            renderedByTemplate,
            s.id,
            s.name,
            [s.category, s.proficiency].filter(Boolean).join(' · ') ||
              undefined,
            byRecord.get(`skill:${s.id}`) ?? [],
          ),
        );
      } else if (kind === 'certifications') {
        records = snapshot.certifications.map((c) => {
          const term = termKeys.get(canonicalSkillKey(c.name));
          return record(
            kind,
            field,
            renderedByTemplate,
            c.id,
            c.name,
            c.issuer,
            [],
            term ? [{ term: term.term, importance: term.importance }] : [],
          );
        });
      } else {
        records = snapshot.achievements.map((a) =>
          record(kind, field, renderedByTemplate, a.id, a.title, a.date, []),
        );
      }
      return { kind, label, renderedByTemplate, records };
    },
  );

  let status: SelectionReviewDocumentStatus;
  let selectionChangesDocument = true;
  let limitation: string | undefined;
  if (!document) {
    status = 'not_captured';
    limitation =
      'This version predates document snapshots, so the document it showed was never stored. A revised version is generated from its frozen profile data with the standard template; any custom LaTeX is not applied.';
  } else if (document.kind === 'custom_preserved') {
    status = 'custom_preserved';
    selectionChangesDocument = false;
    limitation =
      'This version uses your own LaTeX. A changed selection is recorded with the new version, but the document stays exactly as it is unless you choose the standard template.';
  } else {
    status = 'generated';
  }

  return {
    versionId: version.id,
    resumeProfileId: version.resumeProfileId,
    ...(version.targetCompany ? { targetCompany: version.targetCompany } : {}),
    ...(version.targetRole ? { targetRole: version.targetRole } : {}),
    selectionMode: mode,
    document: {
      status,
      selectionChangesDocument,
      ...(limitation ? { limitation } : {}),
    },
    recommendationsAvailable,
    sections,
  };
}

/** Ids a revision may select: only records that exist in the base version's frozen snapshot. */
export function selectableIds(version: ResumeVersion): SelectedRecordIds {
  const s = version.masterProfileSnapshot;
  return {
    experienceIds: s.experiences.map((r) => r.id),
    projectIds: s.projects.map((r) => r.id),
    skillIds: s.skills.map((r) => r.id),
    certificationIds: s.certifications.map((r) => r.id),
    achievementIds: s.achievements.map((r) => r.id),
  };
}
