"use client";

import type { JobOpportunity } from "@repo/types";
import { Loader2, Plus, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

const MIN_DESCRIPTION = 50;

interface AddJobDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (job: JobOpportunity) => void;
  /** Open a job the workspace already had (the pasted posting was a duplicate). */
  onViewExisting?: (job: JobOpportunity) => void;
}

/** What the user has already done with a job, in plain words. */
function describeHistory(job: JobOpportunity): string {
  const state = job.workspaceState;
  if (state?.status === "applied") {
    const when = state.appliedAt
      ? ` on ${new Date(state.appliedAt).toLocaleDateString()}`
      : "";
    return `You already applied to it${when}.`;
  }
  if (state?.status === "dismissed") return "You dismissed it earlier.";
  if (state?.status === "saved") return "You saved it earlier.";
  return "It is already in your Job Radar.";
}

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#1d68ed]/30 focus:border-[#1d68ed]";

export function AddJobDialog({
  open,
  onClose,
  onCreated,
  onViewExisting,
}: AddJobDialogProps) {
  const [existingJob, setExistingJob] = useState<JobOpportunity | null>(null);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [isRemote, setIsRemote] = useState(false);
  const [salaryRange, setSalaryRange] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) setExistingJob(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    titleRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [open, submitting, onClose]);

  if (!open) return null;

  const descriptionLength = description.trim().length;
  const canSubmit =
    title.trim().length >= 2 &&
    company.trim().length > 0 &&
    descriptionLength >= MIN_DESCRIPTION &&
    !submitting;

  const reset = () => {
    setTitle("");
    setCompany("");
    setLocation("");
    setIsRemote(false);
    setSalaryRange("");
    setSourceUrl("");
    setDescription("");
    setError(null);
    setExistingJob(null);
    setImportUrl("");
    setImportNotice(null);
    setImportError(null);
  };

  /** Fill the form from a public posting URL. Saves nothing; the user reviews. */
  const handleImport = async () => {
    const url = importUrl.trim();
    if (!url || importing) return;
    setImporting(true);
    setImportNotice(null);
    setImportError(null);
    try {
      const response = await fetch("/api/jobs/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          message?: string | string[];
        };
        const message = Array.isArray(body.message)
          ? body.message.join(" ")
          : body.message;
        throw new Error(
          message ?? "Could not import that page. Paste the description instead.",
        );
      }
      const draft = (await response.json()) as {
        title: string;
        company: string;
        location?: string;
        isRemote: boolean;
        salaryRange?: string;
        description: string;
        sourceUrl: string;
      };
      setTitle(draft.title);
      setCompany(draft.company);
      setLocation(draft.location ?? "");
      setIsRemote(draft.isRemote);
      setSalaryRange(draft.salaryRange ?? "");
      setDescription(draft.description);
      setSourceUrl(draft.sourceUrl);
      setExistingJob(null);
      setError(null);
      setImportNotice(
        "Imported. Check the fields below and edit anything that looks off, then add the job.",
      );
    } catch (e) {
      setImportError(
        e instanceof Error
          ? e.message
          : "Could not import that page. Paste the description instead.",
      );
    } finally {
      setImporting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    setExistingJob(null);
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          company,
          description,
          // Optional fields are omitted when blank (the API rejects "" URLs).
          ...(location.trim() ? { location } : {}),
          ...(isRemote ? { isRemote: true } : {}),
          ...(salaryRange.trim() ? { salaryRange } : {}),
          ...(sourceUrl.trim() ? { sourceUrl } : {}),
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          message?: string | string[];
        };
        const message = Array.isArray(body.message)
          ? body.message.join(" ")
          : body.message;
        throw new Error(message ?? "Could not add this job.");
      }
      const result = (await response.json()) as {
        job: JobOpportunity;
        duplicate: boolean;
      };
      if (result.duplicate) {
        // Nothing was created: tell the user instead of closing silently.
        setExistingJob(result.job);
        return;
      }
      reset();
      onCreated(result.job);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add this job.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-job-title"
      className="fixed inset-0 z-50 flex items-start justify-center px-4 py-8 overflow-y-auto"
    >
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
        onClick={() => {
          if (!submitting) onClose();
        }}
        aria-hidden="true"
      />
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="relative w-full max-w-2xl rounded-xl bg-white shadow-xl border border-slate-200 flex flex-col gap-4 p-5 sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="add-job-title" className="text-lg font-bold text-slate-900">
              Add a job
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Paste a job from any site. It is private to your workspace and
              scored against your Master Career Profile.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
          <label
            htmlFor="import-job-url"
            className="text-xs font-medium text-slate-700"
          >
            Import from URL (optional)
          </label>
          <div className="flex gap-2">
            <input
              id="import-job-url"
              type="text"
              inputMode="url"
              value={importUrl}
              onChange={(e) => {
                setImportUrl(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleImport();
                }
              }}
              maxLength={2000}
              disabled={importing || submitting}
              className={inputClass}
              placeholder="https://boards.greenhouse.io/… or https://jobs.lever.co/…"
            />
            <button
              type="button"
              onClick={() => {
                void handleImport();
              }}
              disabled={!importUrl.trim() || importing || submitting}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {importing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {importing ? "Importing…" : "Import"}
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Works with Greenhouse, Lever and pages that publish job data.
            Nothing is saved until you add the job.
          </p>
          {importNotice && (
            <p role="status" className="text-[11px] text-emerald-700">
              {importNotice}
            </p>
          )}
          {importError && (
            <p role="alert" className="text-[11px] text-rose-700">
              {importError}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
            Job title *
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
              }}
              maxLength={200}
              required
              className={inputClass}
              placeholder="Senior Backend Engineer"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
            Company *
            <input
              value={company}
              onChange={(e) => {
                setCompany(e.target.value);
              }}
              maxLength={200}
              required
              className={inputClass}
              placeholder="Acme"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
            Location
            <input
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
              }}
              maxLength={200}
              className={inputClass}
              placeholder="Berlin, Germany"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
            Salary range
            <input
              value={salaryRange}
              onChange={(e) => {
                setSalaryRange(e.target.value);
              }}
              maxLength={100}
              className={inputClass}
              placeholder="$120k – $150k"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
          <input
            type="checkbox"
            checked={isRemote}
            onChange={(e) => {
              setIsRemote(e.target.checked);
            }}
          />
          Remote role
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          Job posting URL
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => {
              setSourceUrl(e.target.value);
            }}
            maxLength={2000}
            className={inputClass}
            placeholder="https://boards.greenhouse.io/…"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          Job description *
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
            }}
            rows={10}
            maxLength={50000}
            required
            className={`${inputClass} resize-y font-mono text-xs leading-relaxed`}
            placeholder="Paste the full job description here…"
          />
          <span
            className={`text-[11px] ${descriptionLength >= MIN_DESCRIPTION || descriptionLength === 0 ? "text-slate-400" : "text-amber-600"}`}
          >
            {descriptionLength < MIN_DESCRIPTION
              ? `At least ${String(MIN_DESCRIPTION)} characters so skills can be matched.`
              : `${String(descriptionLength)} characters`}
          </span>
        </label>

        {existingJob && (
          <div
            role="status"
            className="flex flex-col gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs"
          >
            <p className="font-semibold">
              This job is already in your workspace, so nothing new was added.
            </p>
            <p>
              {existingJob.title} at {existingJob.company}.{" "}
              {describeHistory(existingJob)}
            </p>
            <div>
              <button
                type="button"
                onClick={() => {
                  const job = existingJob;
                  reset();
                  (onViewExisting ?? onCreated)(job);
                }}
                className="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
              >
                View existing job
              </button>
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs"
          >
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] text-white text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            {submitting ? "Adding…" : "Add job"}
          </button>
        </div>
      </form>
    </div>
  );
}
