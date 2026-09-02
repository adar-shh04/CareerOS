"use client";

import type { JobOpportunity, ResumeProfile, ResumeVersion } from "@repo/types";
import { Briefcase, RefreshCw, Sparkles } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import type { TrackedApplication } from "@/lib/api";

import { JobDetailsDrawer } from "./job-details-drawer";
import { JobFilters } from "./job-filters";
import { JobList } from "./job-list";
import { JobSearch } from "./job-search";

interface JobBoardProps {
  onNavigateToResume?: (version: ResumeVersion, profile: ResumeProfile) => void;
}

export function JobBoard({ onNavigateToResume }: JobBoardProps = {}) {
  const [jobs, setJobs] = useState<JobOpportunity[]>([]);
  const [applications, setApplications] = useState<TrackedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
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

  const fetchJobs = useCallback(async (query?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = query ? `?query=${encodeURIComponent(query)}` : "";
      const response = await fetch(`/api/jobs${params}`, { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json()) as JobOpportunity[];
        setJobs(data);
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
      }
    } catch {
      setError({
        status: 0,
        message: "Network error — please check your connection and retry.",
      });
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchJobs();
    void fetchApplications();
  }, [fetchJobs, fetchApplications]);

  const availableSkills = useMemo(() => {
    const skillSet = new Set<string>();
    jobs.forEach((j) => j.requiredSkills.forEach((s) => skillSet.add(s)));
    return Array.from(skillSet);
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // By default hide dismissed jobs unless user enabled showDismissed
      if (!showDismissed && job.workspaceState?.isDismissed) return false;
      if (savedOnly && !job.workspaceState?.isSaved) return false;
      if (remoteOnly && !job.isRemote) return false;
      if (selectedSkill && !job.requiredSkills.includes(selectedSkill))
        return false;
      return true;
    });
  }, [jobs, remoteOnly, savedOnly, showDismissed, selectedSkill]);

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
        await fetchJobs(searchQuery);
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

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Job Radar & Board
            </h1>
            <p className="text-xs text-slate-400">
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
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-200 text-xs font-semibold hover:border-indigo-500/50 transition-colors disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${ingesting ? "animate-spin" : ""}`} />
            {ingesting ? "Ingesting Market Data..." : "Fetch Live Market Jobs"}
          </button>

          <button
            type="button"
            onClick={() => {
              void fetchJobs(searchQuery);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/60 border border-white/10 text-slate-300 text-xs font-semibold hover:border-white/20 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Radar
          </button>
        </div>
      </div>

      {/* Ingestion Error Alert */}
      {ingestError && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          <span>{ingestError}</span>
          <button
            type="button"
            onClick={() => setIngestError(null)}
            className="text-rose-400 hover:text-rose-200 font-bold px-1.5 py-0.5"
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
            void fetchJobs(searchQuery);
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

      {/* Job List */}
      <JobList
        jobs={filteredJobs}
        applicationsByJobId={applicationsByJobId}
        loading={loading}
        error={error}
        onSelectJob={setSelectedJob}
        query={searchQuery}
        onResetQuery={() => {
          setSearchQuery("");
          setSelectedSkill("");
          setRemoteOnly(false);
          void fetchJobs("");
        }}
        onRetry={() => {
          void fetchJobs(searchQuery);
        }}
      />

      {/* Details Drawer */}
      <JobDetailsDrawer
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
    </div>
  );
}

