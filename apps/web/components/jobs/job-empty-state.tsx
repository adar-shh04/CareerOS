"use client";

import { Briefcase, ClipboardPaste, Sparkles } from "lucide-react";
import React from "react";

interface JobEmptyStateProps {
  query?: string;
  onResetQuery?: () => void;
  /** Any search / filter is narrowing the list (so "empty" may be temporary). */
  filtersActive?: boolean;
  /** Only saved jobs are being shown. */
  savedOnly?: boolean;
  /** Open the Add Job dialog. */
  onAddJob?: () => void;
  /** Fetch live market jobs (optional; needs an ingestion token). */
  onFetchLive?: () => void;
  fetchingLive?: boolean;
}

export function JobEmptyState({
  query,
  onResetQuery,
  filtersActive = Boolean(query),
  savedOnly = false,
  onAddJob,
  onFetchLive,
  fetchingLive = false,
}: JobEmptyStateProps) {
  // First run: nothing is filtering the list and it is still empty, so the
  // radar genuinely has no jobs yet. Tell the user how to get their first one.
  if (!filtersActive && onAddJob) {
    return (
      <div className="p-10 text-center rounded-xl border border-slate-200/80 bg-white space-y-4 shadow-xs">
        <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-slate-900">
            No active jobs yet
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Add a job you are interested in and CareerOS will score it against
            your Master Career Profile, show the skills you match and miss, and
            let you build a targeted resume for it.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <button
            type="button"
            onClick={onAddJob}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            Paste your first job
          </button>
          {onFetchLive && (
            <button
              type="button"
              onClick={onFetchLive}
              disabled={fetchingLive}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              <Sparkles
                className={`w-3.5 h-3.5 ${fetchingLive ? "animate-spin" : ""}`}
              />
              {fetchingLive ? "Fetching…" : "Fetch live market jobs"}
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-400 max-w-md mx-auto">
          Live market jobs are optional and need an Apify API token in your
          server configuration. Pasting a job works without any setup.
          Dismissed jobs are hidden by default.
        </p>
      </div>
    );
  }

  return (
    <div className="p-12 text-center rounded-xl border border-slate-200/80 bg-white space-y-3 shadow-xs">
      <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
      <h3 className="text-lg font-bold text-slate-900">No Jobs Found</h3>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">
        {query
          ? `No job opportunities matching "${query}". Try adjusting your filters or search term.`
          : savedOnly
            ? "You have not saved any jobs yet. Save a job from the Job Radar and it will show up here."
            : filtersActive
              ? "No jobs match the current filters. Try clearing a filter."
              : "No active job listings found in the database."}
      </p>
      {query && onResetQuery && (
        <button
          type="button"
          onClick={onResetQuery}
          className="px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
        >
          Clear Search Query
        </button>
      )}
    </div>
  );
}
