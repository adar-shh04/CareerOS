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
  isSelected?: boolean;
  onSelect: (job: JobOpportunity) => void;
}

export function JobCard({
  job,
  trackedApplication,
  isSelected = false,
  onSelect,
}: JobCardProps) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Recent";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
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
      className={`group relative rounded-xl border p-5 transition-all cursor-pointer space-y-4 shadow-xs ${
        isSelected
          ? "border-[#1d68ed] ring-2 ring-[#1d68ed]/30 bg-blue-50/20 shadow-sm"
          : "border-slate-200/80 bg-white hover:border-[#1d68ed]/40 hover:shadow-md"
      }`}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900 group-hover:text-[#1d68ed] transition-colors">
            {job.title}
          </h3>
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
            <span className="flex items-center gap-1 text-slate-800 font-medium">
              <Building2 className="w-3.5 h-3.5 text-[#1d68ed]" />
              {job.company}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {job.location}
            </span>
            {job.isRemote && (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px]">
                <Globe className="w-3 h-3" /> Remote
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {trackedApplication && (
            <span className="inline-flex items-center gap-1 text-blue-700 font-semibold px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px]">
              <TrendingUp className="w-3 h-3 text-[#1d68ed]" /> In Pipeline ({trackedApplication.status})
            </span>
          )}
          {job.workspaceState?.isSaved && !trackedApplication && (
            <span className="inline-flex items-center gap-1 text-purple-700 font-semibold px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-[10px]">
              <Bookmark className="w-3 h-3 fill-purple-400 text-purple-600" /> Saved
            </span>
          )}
          {job.workspaceState?.isDismissed && (
            <span className="inline-flex items-center gap-1 text-amber-700 font-semibold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px]">
              <EyeOff className="w-3 h-3 text-amber-600" /> Dismissed
            </span>
          )}
          {job.matchScore != null && <JobMatchBadge score={job.matchScore} />}
        </div>
      </div>

      {job.whyFits && (
        <p className="text-xs text-slate-700 leading-relaxed bg-[#f4f8ff] p-3 rounded-lg border border-blue-100 line-clamp-2">
          <span className="font-semibold text-[#1d68ed]">Match Reason:</span> {job.whyFits}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {job.requiredSkills.slice(0, 4).map((skill) => (
          <span
            key={skill}
            className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px] font-medium border border-slate-200/60"
          >
            {skill}
          </span>
        ))}
        {job.requiredSkills.length > 4 && (
          <span className="px-2 py-0.5 rounded bg-slate-50 text-slate-500 text-[11px]">
            +{job.requiredSkills.length - 4} more
          </span>
        )}
      </div>

      <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          {job.salaryRange && (
            <span className="flex items-center gap-1 text-slate-800 font-semibold">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
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
          className="flex items-center gap-1 text-[#1d68ed] hover:text-[#1555c8] font-semibold text-xs transition-colors cursor-pointer"
        >
          Details <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
