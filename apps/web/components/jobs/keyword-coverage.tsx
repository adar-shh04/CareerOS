"use client";

import type {
  EvidenceReference,
  JobKeywordCoverage,
  KeywordCoverageGroup,
  KeywordCoverageStatus,
  KeywordCoverageSummary,
  KeywordCoverageTerm,
} from "@repo/types";
import { CheckCircle2, CircleDashed, HelpCircle } from "lucide-react";
import React, { useState } from "react";

const GROUPS: { id: KeywordCoverageGroup; label: string }[] = [
  { id: "technical_skills", label: "Technical skills" },
  { id: "tools_frameworks", label: "Tools & frameworks" },
  { id: "domain_knowledge", label: "Domain knowledge" },
];

const STATUS: Record<
  KeywordCoverageStatus,
  { label: string; hint: string; className: string; Icon: typeof CheckCircle2 }
> = {
  evidenced: {
    label: "Listed on experience or project",
    hint: "The term is in the technologies list of an experience or project. The profile does not verify how it was used.",
    className: "bg-emerald-50 border-emerald-200 text-emerald-800",
    Icon: CheckCircle2,
  },
  listed_only: {
    label: "Listed only in skills",
    hint: "It is in your skills list, but no experience or project lists it.",
    className: "bg-amber-50 border-amber-200 text-amber-800",
    Icon: HelpCircle,
  },
  missing: {
    label: "Not found in profile",
    hint: "Nothing in your Master Career Profile lists this.",
    className: "bg-slate-100 border-slate-200 text-slate-600",
    Icon: CircleDashed,
  },
};

function evidenceLabel(ref: EvidenceReference): string {
  if (ref.kind === "project") return `${ref.label} (project)`;
  if (ref.kind === "skill" || ref.kind === "technology") {
    return `${ref.label} (skills list)`;
  }
  return ref.label;
}

function CoverageBar({
  title,
  summary,
}: {
  title: string;
  summary: KeywordCoverageSummary;
}) {
  if (summary.total === 0) {
    return (
      <div className="text-xs text-slate-500">
        <span className="font-semibold text-slate-700">{title}:</span> the
        posting lists none.
      </div>
    );
  }
  const percent = summary.percent ?? 0;
  // Two different things are counted, so they are shown as two different
  // segments: terms backed by an experience or project (solid), and terms that
  // are only in the skills lists (lighter). Never one merged number.
  const evidencedWidth = (summary.evidenced / summary.total) * 100;
  const listedOnlyWidth = (summary.listedOnly / summary.total) * 100;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-700">{title}</span>
        <span className="text-slate-700">
          {summary.evidenced} of {summary.total} listed on an experience or
          project
        </span>
      </div>
      <div
        className="flex h-1.5 rounded-full bg-slate-200 overflow-hidden"
        role="img"
        aria-label={`${title}: ${String(summary.evidenced)} listed on an experience or project, ${String(summary.listedOnly)} listed only in skills, ${String(summary.missing)} not found in profile, out of ${String(summary.total)}`}
      >
        <div
          className="h-full bg-[#1d68ed]"
          style={{ width: `${String(evidencedWidth)}%` }}
        />
        <div
          className="h-full bg-amber-300"
          style={{ width: `${String(listedOnlyWidth)}%` }}
        />
      </div>
      <p className="text-[11px] text-slate-500">
        {summary.matched} of {summary.total} are in your profile ({percent}%)
        {summary.listedOnly > 0
          ? `, but ${String(summary.listedOnly)} of those ${summary.listedOnly === 1 ? "is" : "are"} listed only in your skills, on no experience or project`
          : ""}
        {summary.missing > 0
          ? `; ${String(summary.missing)} not found in profile`
          : ""}
        .
      </p>
    </div>
  );
}

function TermRow({ term }: { term: KeywordCoverageTerm }) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS[term.status];
  const shown = expanded ? term.evidence : term.evidence.slice(0, 3);
  const hidden = term.evidence.length - shown.length;
  return (
    <li className="rounded-lg border border-slate-200/80 bg-white p-2.5 space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-slate-900">
          {term.term}
        </span>
        <span className="text-[10px] uppercase tracking-wide text-slate-500 border border-slate-200 rounded px-1.5 py-0.5">
          {term.importance}
        </span>
        <span
          title={status.hint}
          className={`inline-flex items-center gap-1 text-[11px] font-medium border rounded-md px-1.5 py-0.5 ${status.className}`}
        >
          <status.Icon className="w-3 h-3" aria-hidden="true" />
          {status.label}
        </span>
        {term.selectedForResume !== undefined && (
          <span className="text-[11px] text-slate-600">
            {term.selectedForResume
              ? "In this resume's selection"
              : "Not in this resume's selection"}
          </span>
        )}
      </div>
      {term.evidence.length > 0 ? (
        <p className="text-xs text-slate-600">
          <span className="font-medium text-slate-700">
            {term.status === "listed_only" ? "Only listed in: " : "Listed on: "}
          </span>
          {shown.map(evidenceLabel).join(" · ")}
          {hidden > 0 && (
            <>
              {" "}
              <button
                type="button"
                onClick={() => {
                  setExpanded(true);
                }}
                className="text-[#1d68ed] hover:underline cursor-pointer"
              >
                +{hidden} more
              </button>
            </>
          )}
        </p>
      ) : (
        <p className="text-xs text-slate-500">
          A gap. Add it to your profile only if you genuinely have this
          experience.
        </p>
      )}
    </li>
  );
}

/**
 * Deterministic keyword coverage: which skills the posting lists and what in the
 * Master Career Profile supports each one. Not an ATS score, and nothing here
 * is generated by a model or implies an improvement estimate.
 */
export function KeywordCoveragePanel({
  coverage,
}: {
  coverage: JobKeywordCoverage;
}) {
  return (
    <section className="space-y-4" aria-labelledby="keyword-coverage-title">
      <div>
        <h4
          id="keyword-coverage-title"
          className="text-xs font-bold uppercase tracking-wider text-slate-900"
        >
          Keyword coverage
        </h4>
        <p className="text-[11px] text-slate-500 mt-0.5">
          How the posting&apos;s keywords line up with your Master Career
          Profile. This is not an ATS score.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50 p-3">
        <CoverageBar title="Required coverage" summary={coverage.required} />
        <CoverageBar title="Preferred coverage" summary={coverage.preferred} />
      </div>

      {coverage.terms.length === 0 && (
        <p className="text-xs text-slate-500">
          This posting does not list any identifiable skills, so there is
          nothing to compare.
        </p>
      )}

      {GROUPS.map(({ id, label }) => {
        const terms = coverage.terms.filter((term) => term.group === id);
        if (terms.length === 0) return null;
        return (
          <div key={id} className="space-y-1.5">
            <span className="block text-xs font-medium text-slate-700">
              {label}
            </span>
            <ul className="space-y-1.5">
              {terms.map((term) => (
                <TermRow key={`${term.importance}:${term.key}`} term={term} />
              ))}
            </ul>
          </div>
        );
      })}

      <p className="text-[11px] text-slate-500">
        Matches come from the technologies listed on your experiences and
        projects and from your skills lists. CareerOS does not verify how a
        listed technology was used, and skills mentioned only inside bullet text
        are not counted.
      </p>
    </section>
  );
}
