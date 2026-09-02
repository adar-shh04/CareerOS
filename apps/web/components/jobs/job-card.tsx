"use client";

import type { JobOpportunity } from "@repo/types";
import {
  Bookmark,
  Building2,
  Calendar,
  DollarSign,
  ExternalLink,
  EyeOff,
  Globe,
  MapPin,
  TrendingUp,
} from "lucide-react";
import React from "react";

import type { TrackedApplication } from "@/lib/api";

import { JobMatchBadge } from "./job-match-badge";

interface JobCardProps {
  job: JobOpportunity;
  trackedApplication?: TrackedApplication | null;
  onSelect: (job: JobOpportunity) => void;
}

export function JobCard({ job, trackedApplication, onSelect }: JobCardProps) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Recent";
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Recent";
    }
  };

  return (
    <div
      onClick={() => onSelect(job)}
      className="group relative rounded-xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-md transition-all hover:border-indigo-500/40 hover:bg-slate-900/80 cursor-pointer space-y-4 shadow-lg shadow-black/20"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
        <div>
          <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
            {job.title}
          </h3>
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
            <span className="flex items-center gap-1 text-slate-300 font-medium">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              {job.company}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              {job.location}
            </span>
            {job.isRemote && (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px]">
                <Globe className="w-3 h-3" /> Remote
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {trackedApplication && (
            <span className="inline-flex items-center gap-1 text-cyan-300 font-semibold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-[10px]">
              <TrendingUp className="w-3 h-3 text-cyan-400" /> In Pipeline ({trackedApplication.status})
            </span>
          )}
          {job.workspaceState?.isSaved && !trackedApplication && (
            <span className="inline-flex items-center gap-1 text-purple-300 font-semibold px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-[10px]">
              <Bookmark className="w-3 h-3 fill-purple-400/40 text-purple-400" /> Saved
            </span>
          )}
          {job.workspaceState?.isDismissed && (
            <span className="inline-flex items-center gap-1 text-amber-300 font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10px]">
              <EyeOff className="w-3 h-3 text-amber-400" /> Dismissed
            </span>
          )}
          {job.matchScore != null && <JobMatchBadge score={job.matchScore} />}
        </div>
      </div>

      {job.whyFits && (
        <p className="text-xs text-slate-300 leading-relaxed bg-indigo-500/5 p-3 rounded-lg border border-indigo-500/10">
          <span className="font-semibold text-indigo-300">Match Reason:</span> {job.whyFits}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {job.requiredSkills.slice(0, 4).map((skill) => (
          <span
            key={skill}
            className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] font-medium border border-white/5"
          >
            {skill}
          </span>
        ))}
        {job.requiredSkills.length > 4 && (
          <span className="px-2 py-0.5 rounded bg-slate-800/60 text-slate-400 text-[11px]">
            +{job.requiredSkills.length - 4} more
          </span>
        )}
      </div>

      <div className="flex justify-between items-center pt-3 border-t border-white/5 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          {job.salaryRange && (
            <span className="flex items-center gap-1 text-slate-300 font-semibold">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              {job.salaryRange}
            </span>
          )}
          <span className="flex items-center gap-1 text-slate-500">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(job.postedAt)}
          </span>
        </div>

        <button
          type="button"
          className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold text-xs transition-colors"
        >
          Details <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
