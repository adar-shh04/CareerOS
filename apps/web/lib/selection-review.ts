import type {
  ResumeSelectionReview,
  SelectedRecordIds,
  SelectionReviewRecord,
  SelectionReviewSection,
  SelectionReviewSectionKind,
} from "@repo/types";

/**
 * Pure logic behind the version selection review. Nothing here talks to the
 * network or React, so it can be tested directly.
 *
 * A "selection" is the set of record ids the user has ticked, per section.
 * Ticking a record means "selected for the resume"; it never proves the record
 * is represented in the document (that is `representedInDocument`).
 */

export const SECTION_KINDS: SelectionReviewSectionKind[] = [
  "experiences",
  "projects",
  "skills",
  "certifications",
  "achievements",
];

export type SelectionState = Record<SelectionReviewSectionKind, string[]>;

export const SECTION_ID_KEY: Record<
  SelectionReviewSectionKind,
  keyof SelectedRecordIds
> = {
  experiences: "experienceIds",
  projects: "projectIds",
  skills: "skillIds",
  certifications: "certificationIds",
  achievements: "achievementIds",
};

function emptySelection(): SelectionState {
  return {
    experiences: [],
    projects: [],
    skills: [],
    certifications: [],
    achievements: [],
  };
}

function cloneSelection(selection: SelectionState): SelectionState {
  const copy = emptySelection();
  for (const kind of SECTION_KINDS) copy[kind] = [...selection[kind]];
  return copy;
}

/**
 * The selection a version starts from: the records the API reports as
 * `included`. For a "prioritized" version every record of the template-rendered
 * kinds is in the document and `prioritized` only marks emphasis, so it is not
 * consulted here.
 */
export function initialSelection(review: ResumeSelectionReview): SelectionState {
  const state = emptySelection();
  for (const section of review.sections) {
    state[section.kind] = section.records
      .filter((record) => record.included)
      .map((record) => record.id);
  }
  return state;
}

export function isSelected(
  selection: SelectionState,
  kind: SelectionReviewSectionKind,
  id: string,
): boolean {
  return selection[kind].includes(id);
}

export function toggleRecord(
  selection: SelectionState,
  kind: SelectionReviewSectionKind,
  id: string,
  checked: boolean,
): SelectionState {
  const next = cloneSelection(selection);
  const without = next[kind].filter((existing) => existing !== id);
  next[kind] = checked ? [...without, id] : without;
  return next;
}

/**
 * Check records recommended === true, uncheck recommended === false and leave
 * recommended === null exactly as the user has it.
 */
export function applyRecommendations(
  review: ResumeSelectionReview,
  selection: SelectionState,
): SelectionState {
  const next = cloneSelection(selection);
  for (const section of review.sections) {
    const chosen = new Set(next[section.kind]);
    for (const record of section.records) {
      if (record.recommended === true) chosen.add(record.id);
      else if (record.recommended === false) chosen.delete(record.id);
    }
    next[section.kind] = section.records
      .filter((record) => chosen.has(record.id))
      .map((record) => record.id);
  }
  return next;
}

function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

/** True when `current` differs from `initial` in any section. */
export function hasSelectionChanged(
  initial: SelectionState,
  current: SelectionState,
): boolean {
  return SECTION_KINDS.some((kind) => !sameIds(initial[kind], current[kind]));
}

export interface SelectionCounts {
  experiences: number;
  projects: number;
  skills: number;
  certifications: number;
}

/**
 * Counts of checked records in the sections the standard template renders.
 * Achievements are not counted: the template does not print them.
 */
export function countRenderedSelection(
  review: ResumeSelectionReview,
  selection: SelectionState,
): SelectionCounts {
  const counts: SelectionCounts = {
    experiences: 0,
    projects: 0,
    skills: 0,
    certifications: 0,
  };
  for (const section of review.sections) {
    if (!section.renderedByTemplate) continue;
    if (section.kind === "achievements") continue;
    const known = new Set(section.records.map((record) => record.id));
    counts[section.kind] = selection[section.kind].filter((id) =>
      known.has(id),
    ).length;
  }
  return counts;
}

/** Recommended to include but currently unchecked. */
export function relevantButNotSelected(
  section: SelectionReviewSection,
  selection: SelectionState,
): SelectionReviewRecord[] {
  return section.records.filter(
    (record) =>
      record.recommended === true &&
      !isSelected(selection, section.kind, record.id),
  );
}

/** The selectedRecordIds part of the POST .../revisions body. */
export function buildSelectedRecordIds(
  review: ResumeSelectionReview,
  selection: SelectionState,
): SelectedRecordIds {
  const ids: SelectedRecordIds = {
    experienceIds: [],
    projectIds: [],
    skillIds: [],
    certificationIds: [],
    achievementIds: [],
  };
  for (const section of review.sections) {
    const chosen = new Set(selection[section.kind]);
    // Keep review order and drop ids the review does not know about.
    ids[SECTION_ID_KEY[section.kind]] = section.records
      .filter((record) => chosen.has(record.id))
      .map((record) => record.id);
  }
  return ids;
}
