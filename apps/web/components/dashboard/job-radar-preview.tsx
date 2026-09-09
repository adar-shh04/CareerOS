"use client";

import type { JobOpportunity } from "@repo/types";
import {
  Compass,
  MapPin,
  Radar,
  Search,
} from "lucide-react";
import Link from "next/link";
import React from "react";

export interface JobRadarPreviewProps {
  jobs?: JobOpportunity[];
  loading?: boolean;
}

export function JobRadarPreview({
  jobs = [],
  loading = false,
}: JobRadarPreviewProps) {
  const formatWorkType = (job: JobOpportunity) => {
    if (job.isRemote) return "Remote";
    if (job.remotePolicy) {
      const p = job.remotePolicy.toLowerCase();
      if (p === "remote") return "Remote";
      if (p === "hybrid") return "Hybrid";
      if (p === "onsite") return "On-Site";
    }
    return job.employmentType ?? "Full-Time";
  };

  const getWorkTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case "remote":
        return "bg-purple-50 text-purple-700 border-purple-200/80";
      case "hybrid":
        return "bg-indigo-50 text-indigo-700 border-indigo-200/80";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200/80";
    }
  };

  const getMatchBadge = (score?: number) => {
    if (typeof score !== "number") return null;
    const pct = Math.round(score > 1 ? score : score * 100);

    if (pct >= 90) {
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          {pct}% Match
        </span>
      );
    }
    if (pct >= 80) {
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold bg-blue-50 text-[#1d68ed] border border-blue-200/80">
          {pct}% Match
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
        {pct}% Match
      </span>
    );
  };

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "1d ago";
      if (diffDays < 7) return `${String(diffDays)}d ago`;
      return `${String(Math.floor(diffDays / 7))}w ago`;
    } catch {
      return "";
    }
  };

  return (
    <div className="w-full rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs transition-shadow hover:shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-[#1d68ed]">
            <Radar className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Job Radar Matches
          </span>
        </div>

        <Link
          href="/jobs"
          className="text-xs font-semibold text-[#1d68ed] transition-colors hover:text-[#1555c8] hover:underline"
        >
          View all jobs &rarr;
        </Link>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-3 animate-pulse py-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100"
            >
              <div className="space-y-1.5 flex-1 max-w-sm">
                <div className="h-4 w-40 bg-slate-200 rounded-md" />
                <div className="h-3 w-24 bg-slate-100 rounded-md" />
              </div>
              <div className="h-5 w-16 bg-slate-200 rounded-full" />
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        /* Explicit Intelligent Empty State */
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-[#1d68ed]">
            <Compass className="h-6 w-6" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h4 className="text-sm font-bold text-slate-900">
              Your Job Radar is waiting for opportunities
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              No matching jobs ingested yet or your radar filters are waiting for target roles and competencies.
            </p>
          </div>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1d68ed] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#1555c8] transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Discover Jobs</span>
          </Link>
        </div>
      ) : (
        /* Real Data Table */
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th scope="col" className="pb-2.5 font-semibold">Role & Company</th>
                <th scope="col" className="pb-2.5 font-semibold">Location</th>
                <th scope="col" className="pb-2.5 font-semibold">Type</th>
                <th scope="col" className="pb-2.5 font-semibold">Match</th>
                <th scope="col" className="pb-2.5 font-semibold text-right">Posted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {jobs.map((job) => {
                const workType = formatWorkType(job);
                const score = job.match?.overallScore ?? job.matchScore;
                const matchBadge = getMatchBadge(score);

                return (
                  <tr
                    key={job.id}
                    className="group transition-colors hover:bg-slate-50/80"
                  >
                    {/* Role & Company */}
                    <td className="py-3">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="flex items-center gap-3"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 font-bold text-xs text-[#1d68ed] border border-blue-100">
                          {job.company.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 group-hover:text-[#1d68ed] transition-colors truncate max-w-[200px] sm:max-w-xs">
                            {job.title}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {job.company}
                          </div>
                        </div>
                      </Link>
                    </td>

                    {/* Location */}
                    <td className="py-3 text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[120px]">{job.location || "Remote"}</span>
                      </div>
                    </td>

                    {/* Work Type */}
                    <td className="py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${getWorkTypeBadge(
                          workType,
                        )}`}
                      >
                        {workType}
                      </span>
                    </td>

                    {/* Match Score */}
                    <td className="py-3 whitespace-nowrap">
                      {matchBadge ?? (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>

                    {/* Posted Date */}
                    <td className="py-3 text-right text-[11px] text-slate-400 whitespace-nowrap">
                      {formatRelativeTime(job.postedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
