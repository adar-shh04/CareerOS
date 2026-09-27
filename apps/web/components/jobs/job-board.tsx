"use client";

import type { JobOpportunity, ResumeProfile, ResumeVersion } from "@repo/types";
import { Briefcase, RefreshCw, Sparkles } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { TrackedApplication } from "@/lib/api";

import { JobDetailsDrawer } from "./job-details-drawer";
import { JobFilters } from "./job-filters";
import { JobList } from "./job-list";
import { JobSearch } from "./job-search";

/** Jobs requested per page; results are ranked server-side before paging. */
const PAGE_SIZE = 50;

interface JobBoardProps {
  onNavigateToResume?: (version: ResumeVersion, profile: ResumeProfile) => void;
  initialSavedOnly?: boolean;
}

export function JobBoard({
  onNavigateToResume,
  initialSavedOnly = false,
}: JobBoardProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDualPane, setIsDualPane] = useState(false);
  const [jobs, setJobs] = useState<JobOpportunity[]>([]);
  const [applications, setApplications] = useState<TrackedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // The query last submitted (typing alone does not refetch).
  const [appliedQuery, setAppliedQuery] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(initialSavedOnly);
  const [showDismissed, setShowDismissed] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [selectedJob, setSelectedJob] = useState<JobOpportunity | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(
    null,
  );

  const fetchApplications = useCallback(async () => {
    try {
      const response = await fetch("/api/applications", { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json()) as TrackedApplication[];
        setApplications(data);
      }
    } catch {
      /* ignore background failure */
    }
  }, []);

  const applicationsByJobId = useMemo(() => {
    return new Map(applications.map((app) => [app.jobId, app]));
  }, [applications]);

  // Filters are applied by the API to the whole job catalog, and results come
  // back already ranked; pages are appended with "Load more".
  const listUrl = useCallback(
    (offset: number) => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      if (appliedQuery) params.set("query", appliedQuery);
      if (remoteOnly) params.set("remoteOnly", "true");
      if (selectedSkill) params.set("skill", selectedSkill);
      if (savedOnly) params.set("savedOnly", "true");
      if (!showDismissed) params.set("hideDismissed", "true");
      return `/api/jobs?${params.toString()}`;
    },
    [appliedQuery, remoteOnly, selectedSkill, savedOnly, showDismissed],
  );

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(listUrl(0), { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json()) as JobOpportunity[];
        setJobs(data);
        setHasMore(data.length === PAGE_SIZE);
      } else {
        const body = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        setError({
          status: response.status,
          message:
            body.message ??
            (response.status === 401
              ? "Your session could not be verified. Please sign in again."
              : "Failed to load job opportunities."),
        });
        setJobs([]);
        setHasMore(false);
      }
    } catch {
      setError({
        status: 0,
        message: "Network error — please check your connection and retry.",
      });
      setJobs([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [listUrl]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const response = await fetch(listUrl(jobs.length), { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json()) as JobOpportunity[];
        setJobs((prev) => {
          const seen = new Set(prev.map((j) => j.id));
          return [...prev, ...data.filter((j) => !seen.has(j.id))];
        });
        setHasMore(data.length === PAGE_SIZE);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const runSearch = (query: string) => {
    if (query === appliedQuery) {
      void fetchJobs();
    } else {
      setAppliedQuery(query);
    }
  };

  // Reload from the first page whenever a filter changes.
  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    void fetchApplications();
  }, [fetchApplications]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Container width threshold: >= 1060px enables integrated dual-pane view
        setIsDualPane(entry.contentRect.width >= 1060);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const availableSkills = useMemo(() => {
    const skillSet = new Set<string>();
    jobs.forEach((j) => j.requiredSkills.forEach((s) => skillSet.add(s)));
    if (selectedSkill) skillSet.add(selectedSkill);
    return Array.from(skillSet);
  }, [jobs, selectedSkill]);

  // The server already filtered the whole catalog. This only keeps loaded rows
  // consistent with the active filters after the user changes a job in place
  // (e.g. a job dismissed a moment ago disappears without a reload).
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (!showDismissed && job.workspaceState?.isDismissed) return false;
      if (savedOnly && !job.workspaceState?.isSaved) return false;
      return true;
    });
  }, [jobs, savedOnly, showDismissed]);

  const [ingesting, setIngesting] = useState(false);
  const [ingestError, setIngestError] = useState<string | null>(null);

  const handleIngestJobs = async () => {
    setIngesting(true);
    setIngestError(null);
    try {
      const response = await fetch("/api/jobs/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery || "Software Engineer", limit: 20 }),
      });
      if (response.ok) {
        runSearch(searchQuery);
      } else {
        const body = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        setIngestError(
          body.message ?? "Live market job ingestion failed.",
        );
      }
    } catch {
      setIngestError("Network error — could not reach ingestion service.");
    } finally {
      setIngesting(false);
    }
  };

  const loadMoreButton =
    hasMore && !loading && !error ? (
      <button
        type="button"
        onClick={() => {
          void loadMore();
        }}
        disabled={loadingMore}
        className="self-center mt-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-xs font-medium shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
      >
        {loadingMore ? "Loading…" : "Load more"}
      </button>
    ) : null;

  return (
    <div ref={containerRef} className="flex flex-col gap-6 max-w-7xl mx-auto p-4 sm:p-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0d131f] text-[#38bdf8] flex items-center justify-center shadow-xs">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Job Radar &amp; Board
            </h1>
            <p className="text-xs text-slate-500">
              Personalized job intelligence matching your Master Career Profile.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void handleIngestJobs();
            }}
            disabled={ingesting}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className={`w-3.5 h-3.5 ${ingesting ? "animate-spin" : ""}`} />
            {ingesting ? "Ingesting Market Data..." : "Fetch Live Market Jobs"}
          </button>

          <button
            type="button"
            onClick={() => {
              runSearch(searchQuery);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-xs font-medium shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Radar
          </button>
        </div>
      </div>

      {/* Ingestion Error Alert */}
      {ingestError && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          <span>{ingestError}</span>
          <button
            type="button"
            onClick={() => setIngestError(null)}
            className="text-rose-600 hover:text-rose-800 font-bold px-1.5 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <JobSearch
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={() => {
            runSearch(searchQuery);
          }}
        />
        <JobFilters
          remoteOnly={remoteOnly}
          onToggleRemoteOnly={setRemoteOnly}
          savedOnly={savedOnly}
          onToggleSavedOnly={setSavedOnly}
          showDismissed={showDismissed}
          onToggleShowDismissed={setShowDismissed}
          selectedSkill={selectedSkill}
          onSelectSkill={setSelectedSkill}
          availableSkills={availableSkills}
        />
      </div>

      {/* Integrated Dual-Pane or Standard Responsive List Layout */}
      {isDualPane ? (
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Left Column: Job Cards List */}
          <div className="col-span-12 xl:col-span-5 flex flex-col gap-4">
            <JobList
              jobs={filteredJobs}
              applicationsByJobId={applicationsByJobId}
              loading={loading}
              error={error}
              onSelectJob={setSelectedJob}
              selectedJobId={selectedJob?.id}
              singleColumn={true}
              query={searchQuery}
              onResetQuery={() => {
                setSearchQuery("");
                setSelectedSkill("");
                setRemoteOnly(false);
                runSearch("");
              }}
              onRetry={() => {
                runSearch(searchQuery);
              }}
            />
            {loadMoreButton}
          </div>

          {/* Right Column: In-flow Job Details Panel */}
          <div className="col-span-12 xl:col-span-7">
            {selectedJob ? (
              <JobDetailsDrawer
                isInline={true}
                job={selectedJob}
                trackedApplication={applicationsByJobId.get(selectedJob.id)}
                onClose={() => setSelectedJob(null)}
                onApplicationUpdated={() => {
                  void fetchApplications();
                }}
                onJobUpdated={(updatedJob) => {
                  setSelectedJob(updatedJob);
                  setJobs((prevJobs) =>
                    prevJobs.map((j) => (j.id === updatedJob.id ? updatedJob : j)),
                  );
                }}
                onNavigateToResume={(version, profile) => {
                  setSelectedJob(null);
                  if (onNavigateToResume) {
                    onNavigateToResume(version, profile);
                  }
                }}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 flex flex-col items-center justify-center text-center space-y-3 sticky top-4 min-h-[420px] shadow-2xs">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1d68ed] flex items-center justify-center">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-xs">
                  <h3 className="text-sm font-bold text-slate-900">Select a job opportunity</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Choose a role from the radar to inspect match intelligence, missing skills analysis, and one-click targeted resume generation.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Responsive 1-2 Column Cards */}
          <JobList
            jobs={filteredJobs}
            applicationsByJobId={applicationsByJobId}
            loading={loading}
            error={error}
            onSelectJob={setSelectedJob}
            selectedJobId={selectedJob?.id}
            singleColumn={false}
            query={searchQuery}
            onResetQuery={() => {
              setSearchQuery("");
              setSelectedSkill("");
              setRemoteOnly(false);
              runSearch("");
            }}
            onRetry={() => {
              runSearch(searchQuery);
            }}
          />
          {loadMoreButton}

          {/* Details Drawer (Overlay) */}
          <JobDetailsDrawer
            isInline={false}
            job={selectedJob}
            trackedApplication={selectedJob ? applicationsByJobId.get(selectedJob.id) : undefined}
            onClose={() => setSelectedJob(null)}
            onApplicationUpdated={() => {
              void fetchApplications();
            }}
            onJobUpdated={(updatedJob) => {
              setSelectedJob(updatedJob);
              setJobs((prevJobs) =>
                prevJobs.map((j) => (j.id === updatedJob.id ? updatedJob : j)),
              );
            }}
            onNavigateToResume={(version, profile) => {
              setSelectedJob(null);
              if (onNavigateToResume) {
                onNavigateToResume(version, profile);
              }
            }}
          />
        </>
      )}
    </div>
  );
}

