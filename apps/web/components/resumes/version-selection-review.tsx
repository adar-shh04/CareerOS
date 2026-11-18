"use client";

import type {
  ResumeSelectionReview,
  ResumeVersion,
  SelectionReviewRecord,
  SelectionReviewSection,
} from "@repo/types";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  applyRecommendations,
  buildSelectedRecordIds,
  countRenderedSelection,
  hasSelectionChanged,
  initialSelection,
  isSelected,
  relevantButNotSelected,
  type SelectionState,
  toggleRecord,
} from "@/lib/selection-review";

interface VersionSelectionReviewProps {
  profileId: string;
  versionId: string;
}

function plural(count: number, one: string, many: string): string {
  return `${String(count)} ${count === 1 ? one : many}`;
}

function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "green" | "amber" | "blue";
}) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-600",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    blue: "border-blue-200 bg-blue-50 text-[#1d68ed]",
  };
  return (
    <span
      className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function RecordRow({
  kind,
  record,
  checked,
  showRecommendations,
  onToggle,
}: {
  kind: SelectionReviewSection["kind"];
  record: SelectionReviewRecord;
  checked: boolean;
  showRecommendations: boolean;
  onToggle: (checked: boolean) => void;
}) {
  const inputId = `sel-${kind}-${record.id}`;
  return (
    <li className="flex items-start gap-3 py-2.5">
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        onChange={(event) => onToggle(event.target.checked)}
        className="mt-0.5 h-4 w-4 cursor-pointer accent-[#1d68ed]"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <label
          htmlFor={inputId}
          className="block cursor-pointer text-xs font-semibold text-slate-900"
        >
          {record.label}
          {record.detail && (
            <span className="ml-1.5 font-normal text-slate-500">
              {record.detail}
            </span>
          )}
        </label>

        <div className="flex flex-wrap gap-1">
          {showRecommendations && record.recommended === true && (
            <Badge tone="green">Recommended</Badge>
          )}
          {showRecommendations && record.recommended === false && (
            <Badge tone="amber">Reason to leave out</Badge>
          )}
          {showRecommendations && record.recommended === null && (
            <Badge>No signal</Badge>
          )}
          {record.prioritized && <Badge tone="blue">Prioritized</Badge>}
          {record.representedInDocument === true && (
            <Badge tone="green">In document</Badge>
          )}
          {record.representedInDocument === false && (
            <Badge>Not in document</Badge>
          )}
          {record.representedInDocument === null && (
            <Badge>Document content unknown</Badge>
          )}
        </div>

        {showRecommendations && record.reasons.length > 0 && (
          <p className="text-[11px] leading-relaxed text-slate-600">
            {record.reasons.join(" ")}
          </p>
        )}
        {showRecommendations && record.matchedTerms.length > 0 && (
          <p className="text-[11px] text-slate-500">
            Matched terms:{" "}
            {record.matchedTerms
              .map((match) => `${match.term} (${match.importance})`)
              .join(", ")}
          </p>
        )}
      </div>
    </li>
  );
}

export function VersionSelectionReview({
  profileId,
  versionId,
}: VersionSelectionReviewProps) {
  const router = useRouter();
  const [review, setReview] = useState<ResumeSelectionReview | null>(null);
  const [initial, setInitial] = useState<SelectionState | null>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [useStandardTemplate, setUseStandardTemplate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  const base = `/api/resume-profiles/${profileId}/versions/${versionId}`;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`${base}/selection-review`, {
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as
        | (ResumeSelectionReview & { message?: string })
        | null;
      if (!res.ok || !data) {
        throw new Error(
          data?.message ?? "Unable to load the selection review.",
        );
      }
      const start = initialSelection(data);
      setReview(data);
      setInitial(start);
      setSelection(start);
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : "Unable to load the selection review.",
      );
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    void load();
  }, [load]);

  const changed = useMemo(
    () =>
      initial && selection ? hasSelectionChanged(initial, selection) : false,
    [initial, selection],
  );

  const counts = useMemo(
    () =>
      review && selection ? countRenderedSelection(review, selection) : null,
    [review, selection],
  );

  if (loading) {
    return (
      <section
        aria-busy="true"
        className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white p-6 text-xs text-slate-500 shadow-xs"
      >
        <Loader2 className="h-4 w-4 animate-spin text-[#1d68ed]" />
        Loading selection review...
      </section>
    );
  }

  if (loadError || !review || !selection || !initial || !counts) {
    return (
      <section className="space-y-2 rounded-xl border border-slate-200/80 bg-white p-6 text-xs shadow-xs">
        <h2 className="text-sm font-bold text-slate-900">Selection review</h2>
        <p role="alert" className="text-red-700">
          {loadError ?? "The selection review is not available."}
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
        >
          Try again
        </button>
      </section>
    );
  }

  const showRecommendations = review.recommendationsAvailable;
  const documentStays = !review.document.selectionChangesDocument;
  const keepsDocument = documentStays && !useStandardTemplate;
  const target = [review.targetRole, review.targetCompany]
    .filter(Boolean)
    .join(" at ");

  const handleCreate = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`${base}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedRecordIds: buildSelectedRecordIds(review, selection),
          documentMode: useStandardTemplate ? "generate" : "auto",
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | (Partial<ResumeVersion> & { message?: string | string[] })
        | null;
      if (!res.ok || !data?.id) {
        const message = Array.isArray(data?.message)
          ? data.message.join(" ")
          : data?.message;
        throw new Error(message ?? "Unable to create the revised version.");
      }
      setCreated(true);
      router.push(`/resumes/${profileId}/versions/${data.id}`);
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : "Unable to create the revised version.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      aria-labelledby="selection-review-heading"
      className="space-y-5 rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs print:hidden"
    >
      <div className="space-y-1">
        <h2
          id="selection-review-heading"
          className="text-base font-bold text-slate-900"
        >
          Review what this resume includes
        </h2>
        <p className="text-xs leading-relaxed text-slate-500">
          {target ? `Target: ${target}. ` : ""}
          Three things are shown separately: whether a record exists in the
          Master Profile snapshot of this version, whether it is selected for
          the resume, and whether it appears in the document. Selecting a
          record does not by itself put its content in the document.
        </p>
        <p className="text-xs leading-relaxed text-slate-500">
          {showRecommendations
            ? "Recommendations come from a deterministic comparison with the job posting and each one lists its reasons. They are not a score and do not predict an outcome."
            : "There is no job context for this version, so there are no recommendations to show."}
        </p>
        {review.selectionMode === "prioritized" && (
          <p className="text-xs leading-relaxed text-slate-500">
            This version contains every record of the sections the standard
            template prints; Prioritized only marks the ones placed first.
          </p>
        )}
      </div>

      {review.document.limitation && (
        <p
          role="note"
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
        >
          {review.document.limitation}
        </p>
      )}

      {documentStays && (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700">
          <p>
            Your selection is recorded, but the document stays as it is: this
            version keeps your own LaTeX unchanged.
          </p>
          <label className="flex cursor-pointer items-center gap-2 font-medium text-slate-900">
            <input
              type="checkbox"
              checked={useStandardTemplate}
              onChange={(event) => setUseStandardTemplate(event.target.checked)}
              className="h-4 w-4 cursor-pointer accent-[#1d68ed]"
            />
            Use the standard CareerOS template instead
          </label>
        </div>
      )}

      <div className="space-y-5">
        {review.sections.map((section) => {
          const missed = showRecommendations
            ? relevantButNotSelected(section, selection)
            : [];
          return (
            <fieldset key={section.kind} className="space-y-2">
              <legend className="text-xs font-bold uppercase tracking-wide text-slate-700">
                {section.label}{" "}
                <span className="font-normal normal-case text-slate-500">
                  (
                  {
                    section.records.filter((record) =>
                      isSelected(selection, section.kind, record.id),
                    ).length
                  }{" "}
                  of {section.records.length} selected)
                </span>
              </legend>

              {!section.renderedByTemplate && (
                <p className="text-[11px] text-slate-500">
                  The standard template does not print this section. Selecting
                  items here records them for this version only.
                </p>
              )}

              {missed.length > 0 && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2">
                  <p className="text-[11px] font-bold text-emerald-800">
                    Relevant but not selected
                  </p>
                  <ul className="divide-y divide-emerald-100">
                    {missed.map((record) => (
                      <RecordRow
                        key={record.id}
                        kind={section.kind}
                        record={record}
                        checked={false}
                        showRecommendations={showRecommendations}
                        onToggle={(checked) =>
                          setSelection(
                            toggleRecord(
                              selection,
                              section.kind,
                              record.id,
                              checked,
                            ),
                          )
                        }
                      />
                    ))}
                  </ul>
                </div>
              )}

              {section.records.length === 0 ? (
                <p className="text-[11px] text-slate-500">
                  No records in the Master Profile snapshot.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {section.records
                    .filter((record) => !missed.includes(record))
                    .map((record) => (
                      <RecordRow
                        key={record.id}
                        kind={section.kind}
                        record={record}
                        checked={isSelected(selection, section.kind, record.id)}
                        showRecommendations={showRecommendations}
                        onToggle={(checked) =>
                          setSelection(
                            toggleRecord(
                              selection,
                              section.kind,
                              record.id,
                              checked,
                            ),
                          )
                        }
                      />
                    ))}
                </ul>
              )}
            </fieldset>
          );
        })}
      </div>

      <div className="space-y-3 border-t border-slate-100 pt-4">
        <p aria-live="polite" className="text-xs font-medium text-slate-800">
          {keepsDocument
            ? "The document will stay unchanged; the new version records this selection."
            : `The revised version will contain: ${plural(counts.experiences, "experience", "experiences")}, ${plural(counts.projects, "project", "projects")}, ${plural(counts.skills, "skill", "skills")}, ${plural(counts.certifications, "certification", "certifications")}.`}
        </p>
        <p className="text-[11px] text-slate-500">
          Creating a revision adds a new version. It does not change this
          version, any other version, or any application.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {showRecommendations && (
            <button
              type="button"
              onClick={() =>
                setSelection(applyRecommendations(review, selection))
              }
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Apply recommendations
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setSelection(initial);
              setUseStandardTemplate(false);
            }}
            disabled={!changed && !useStandardTemplate}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset to this version
          </button>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={(!changed && !useStandardTemplate) || saving || created}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#1d68ed] px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#1555c8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create revised version
          </button>
        </div>

        {saveError && (
          <p role="alert" className="text-xs text-red-700">
            {saveError}
          </p>
        )}
        {created && (
          <p role="status" className="text-xs text-emerald-700">
            Revised version created. This version and your applications were not
            changed. Opening the new version...
          </p>
        )}
      </div>
    </section>
  );
}
