"use client";

import type {
  MasterCareerProfile,
  ResumeProfile,
  ResumeVersion,
} from "@repo/types";
import { CheckCircle2, AlertCircle, Layers, History, Sparkles, User } from "lucide-react";
import React from "react";

interface ResumeOverviewCardsProps {
  masterProfile: MasterCareerProfile | null;
  profiles: ResumeProfile[];
  versions: ResumeVersion[];
}

export function ResumeOverviewCards({
  masterProfile,
  profiles,
  versions,
}: ResumeOverviewCardsProps) {
  // Check if master profile has meaningful data
  const hasMasterData = Boolean(
    masterProfile &&
      (masterProfile.identity?.fullName ||
        (masterProfile.experiences && masterProfile.experiences.length > 0) ||
        (masterProfile.skills && masterProfile.skills.length > 0) ||
        (masterProfile.education && masterProfile.education.length > 0))
  );

  // Latest version resolution
  const latestVersion = versions.length > 0 ? versions[0] : null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    } catch {
      return null;
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Master Profile Status */}
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-md transition-all hover:border-white/20">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Master Profile
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <User className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          {hasMasterData ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-emerald-400">Complete</div>
                <div className="text-xs text-slate-400">Source of truth active</div>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-amber-400">Incomplete</div>
                <div className="text-xs text-slate-400">Add identity & experience</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Card 2: Resume Profiles */}
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-md transition-all hover:border-white/20">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Resume Profiles
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Layers className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-white tracking-tight">
            {profiles.length}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {profiles.length === 1 ? "Targeted resume" : "Targeted resumes"}
          </div>
        </div>
      </div>

      {/* Card 3: Resume Versions */}
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-md transition-all hover:border-white/20">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Resume Versions
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <History className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-white tracking-tight">
            {versions.length}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {versions.length === 1 ? "Snapshot generated" : "Snapshots generated"}
          </div>
        </div>
      </div>

      {/* Card 4: Latest Version */}
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-md transition-all hover:border-white/20">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Latest Version
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Sparkles className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          {latestVersion ? (
            <div>
              <div className="text-sm font-semibold text-white truncate max-w-[180px]">
                {latestVersion.targetRole || latestVersion.targetCompany || `Snapshot #${versions.length}`}
              </div>
              <div className="text-xs text-slate-400 mt-0.5 truncate">
                {latestVersion.targetCompany ? `${latestVersion.targetCompany} • ` : ""}
                {formatDate(latestVersion.createdAt) || "Recently"}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-sm font-medium text-slate-400">No versions yet</div>
              <div className="text-xs text-slate-500 mt-0.5">Create a snapshot to track</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
