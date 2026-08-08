"use client";

import type { JobOpportunity } from "@repo/types";
import { Briefcase, RefreshCw, Sparkles } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { JobDetailsDrawer } from "./job-details-drawer";
import { JobFilters } from "./job-filters";
import { JobList } from "./job-list";
import { JobSearch } from "./job-search";

export function JobBoard() {
  const [jobs, setJobs] = useState<JobOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [selectedJob, setSelectedJob] = useState<JobOpportunity | null>(null);

  const fetchJobs = useCallback(async (query?: string) => {
    setLoading(true);
    try {
      const params = query ? `?query=${encodeURIComponent(query)}` : "";
      const response = await fetch(`/api/jobs${params}`, { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json()) as JobOpportunity[];
        setJobs(data);
      }
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  const availableSkills = useMemo(() => {
    const skillSet = new Set<string>();
    jobs.forEach((j) => j.requiredSkills.forEach((s) => skillSet.add(s)));
    return Array.from(skillSet);
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (remoteOnly && !job.isRemote) return false;
      if (selectedSkill && !job.requiredSkills.includes(selectedSkill))
        return false;
      return true;
    });
  }, [jobs, remoteOnly, selectedSkill]);

  const [ingesting, setIngesting] = useState(false);

  const handleIngestJobs = async () => {
    setIngesting(true);
    try {
      const response = await fetch("/api/jobs/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery || "Software Engineer", limit: 20 }),
      });
      if (response.ok) {
        await fetchJobs(searchQuery);
      }
    } catch {
      // Handled gracefully
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
            onClick={handleIngestJobs}
            disabled={ingesting}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-200 text-xs font-semibold hover:border-indigo-500/50 transition-colors disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${ingesting ? "animate-spin" : ""}`} />
            {ingesting ? "Ingesting Market Data..." : "Fetch Live Market Jobs"}
          </button>

          <button
            type="button"
            onClick={() => fetchJobs(searchQuery)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/60 border border-white/10 text-slate-300 text-xs font-semibold hover:border-white/20 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Radar
          </button>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <JobSearch
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={() => fetchJobs(searchQuery)}
        />
        <JobFilters
          remoteOnly={remoteOnly}
          onToggleRemoteOnly={setRemoteOnly}
          selectedSkill={selectedSkill}
          onSelectSkill={setSelectedSkill}
          availableSkills={availableSkills}
        />
      </div>

      {/* Job List */}
      <JobList
        jobs={filteredJobs}
        loading={loading}
        onSelectJob={setSelectedJob}
        query={searchQuery}
        onResetQuery={() => {
          setSearchQuery("");
          setSelectedSkill("");
          setRemoteOnly(false);
          void fetchJobs("");
        }}
      />

      {/* Details Drawer */}
      <JobDetailsDrawer
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onJobUpdated={(updatedJob) => {
          setSelectedJob(updatedJob);
          setJobs((prevJobs) =>
            prevJobs.map((j) => (j.id === updatedJob.id ? updatedJob : j)),
          );
        }}
      />
    </div>
  );
}

