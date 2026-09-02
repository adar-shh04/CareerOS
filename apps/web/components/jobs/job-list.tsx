"use client";

import type { JobOpportunity } from "@repo/types";
import React from "react";

import type { TrackedApplication } from "@/lib/api";

import { JobCard } from "./job-card";
import { JobEmptyState } from "./job-empty-state";
import { JobErrorState } from "./job-error-state";
import { JobSkeleton } from "./job-skeleton";

interface JobListProps {
  jobs: JobOpportunity[];
  applicationsByJobId?: Map<string, TrackedApplication>;
  loading: boolean;
  error?: { status: number; message: string } | null;
  onSelectJob: (job: JobOpportunity) => void;
  query?: string;
  onResetQuery?: () => void;
  onRetry?: () => void;
}

export function JobList({
  jobs,
  applicationsByJobId,
  loading,
  error,
  onSelectJob,
  query,
  onResetQuery,
  onRetry,
}: JobListProps) {
  if (loading) {
    return <JobSkeleton />;
  }

  if (error) {
    return (
      <JobErrorState
        status={error.status}
        message={error.message}
        onRetry={onRetry}
      />
    );
  }

  if (jobs.length === 0) {
    return <JobEmptyState query={query} onResetQuery={onResetQuery} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          trackedApplication={applicationsByJobId?.get(job.id)}
          onSelect={onSelectJob}
        />
      ))}
    </div>
  );
}
