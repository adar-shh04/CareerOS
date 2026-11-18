import assert from "node:assert/strict";
import test from "node:test";

import type {
  ResumeSelectionReview,
  SelectionReviewRecord,
} from "@repo/types";

import {
  applyRecommendations,
  buildSelectedRecordIds,
  countRenderedSelection,
  hasSelectionChanged,
  initialSelection,
  relevantButNotSelected,
  toggleRecord,
} from "./selection-review";

function rec(
  id: string,
  included: boolean,
  recommended: boolean | null,
): SelectionReviewRecord {
  return {
    id,
    label: id,
    included,
    prioritized: false,
    recommended,
    reasons: [],
    matchedTerms: [],
    representedInDocument: null,
  };
}

const review: ResumeSelectionReview = {
  versionId: "v1",
  resumeProfileId: "p1",
  selectionMode: "included",
  document: { status: "generated", selectionChangesDocument: true },
  recommendationsAvailable: true,
  sections: [
    {
      kind: "experiences",
      label: "Experiences",
      renderedByTemplate: true,
      records: [rec("e1", true, false), rec("e2", false, true), rec("e3", true, null)],
    },
    {
      kind: "projects",
      label: "Projects",
      renderedByTemplate: true,
      records: [rec("p1", false, true)],
    },
    { kind: "skills", label: "Skills", renderedByTemplate: true, records: [] },
    { kind: "certifications", label: "Certifications", renderedByTemplate: true, records: [] },
    {
      kind: "achievements",
      label: "Achievements",
      renderedByTemplate: false,
      records: [rec("a1", true, null)],
    },
  ],
};

void test("initialSelection starts from included records", () => {
  const s = initialSelection(review);
  assert.deepEqual(s.experiences, ["e1", "e3"]);
  assert.deepEqual(s.projects, []);
  assert.deepEqual(s.achievements, ["a1"]);
});

void test("applyRecommendations checks true, unchecks false, keeps null", () => {
  const next = applyRecommendations(review, initialSelection(review));
  assert.deepEqual(next.experiences, ["e2", "e3"]);
  assert.deepEqual(next.projects, ["p1"]);
  assert.deepEqual(next.achievements, ["a1"]);
});

void test("hasSelectionChanged ignores order and detects edits", () => {
  const initial = initialSelection(review);
  assert.equal(hasSelectionChanged(initial, initialSelection(review)), false);
  const toggledBack = toggleRecord(
    toggleRecord(initial, "experiences", "e1", false),
    "experiences",
    "e1",
    true,
  );
  assert.equal(hasSelectionChanged(initial, toggledBack), false);
  assert.equal(
    hasSelectionChanged(initial, toggleRecord(initial, "projects", "p1", true)),
    true,
  );
});

void test("counts only template-rendered sections and excludes achievements", () => {
  const counts = countRenderedSelection(review, initialSelection(review));
  assert.deepEqual(counts, {
    experiences: 2,
    projects: 0,
    skills: 0,
    certifications: 0,
  });
});

void test("relevantButNotSelected lists recommended unchecked records", () => {
  const experiencesSection = review.sections.find(
    (section) => section.kind === "experiences",
  );
  assert.ok(experiencesSection);
  const s = initialSelection(review);
  assert.deepEqual(
    relevantButNotSelected(experiencesSection, s).map((r) => r.id),
    ["e2"],
  );
  assert.deepEqual(
    relevantButNotSelected(experiencesSection, applyRecommendations(review, s)),
    [],
  );
});

void test("buildSelectedRecordIds maps every kind and drops unknown ids", () => {
  const s = toggleRecord(initialSelection(review), "projects", "ghost", true);
  assert.deepEqual(buildSelectedRecordIds(review, s), {
    experienceIds: ["e1", "e3"],
    projectIds: [],
    skillIds: [],
    certificationIds: [],
    achievementIds: ["a1"],
  });
});
