"use client";

import type { JobOpportunity, ResumeProfile, ResumeVersion } from "@repo/types";
import {
  Bookmark,
  Building2,
  CheckCircle2,
  DollarSign,
  ExternalLink,
  EyeOff,
  Globe,
  MapPin,
  RotateCcw,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";

import type { TrackedApplication } from "@/lib/api";

import { JobMatchBadge } from "./job-match-badge";

interface JobDetailsDrawerProps {
  job: JobOpportunity | null;
  trackedApplication?: TrackedApplication | null;
  onClose: () => void;
  onJobUpdated?: (updatedJob: JobOpportunity) => void;
  onApplicationUpdated?: () => void;
  onNavigateToResume?: (version: ResumeVersion, profile: ResumeProfile) => void;
}

export function JobDetailsDrawer({
  job,
  trackedApplication,
  onClose,
  onJobUpdated,
  onApplicationUpdated,
  onNavigateToResume,
}: JobDetailsDrawerProps) {
  const [matching, setMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [creatingResume, setCreatingResume] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [notes, setNotes] = useState(job?.workspaceState?.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    setNotes(job?.workspaceState?.notes ?? "");
  }, [job]);

  if (!job) return null;

  const isSaved = job.workspaceState?.isSaved ?? false;
  const isDismissed = job.workspaceState?.isDismissed ?? false;

  const handleSaveToggle = async () => {
    setActionLoading(true);
    try {
      if (isSaved) {
        // Toggle saved off via state update
        const res = await fetch(`/api/jobs/${job.id}/state`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isSaved: false, status: "discovered" }),
        });
        if (res.ok) {
          const updated = (await res.json()) as JobOpportunity;
          onJobUpdated?.(updated);
        }
      } else {
        const res = await fetch(`/api/jobs/${job.id}/save`, { method: "POST" });
        if (res.ok) {
          const updated = (await res.json()) as JobOpportunity;
          onJobUpdated?.(updated);
        }
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDismissToggle = async () => {
    setActionLoading(true);
    try {
      if (isDismissed) {
        const res = await fetch(`/api/jobs/${job.id}/restore`, { method: "POST" });
        if (res.ok) {
          const updated = (await res.json()) as JobOpportunity;
          onJobUpdated?.(updated);
        }
      } else {
        const res = await fetch(`/api/jobs/${job.id}/dismiss`, { method: "POST" });
        if (res.ok) {
          const updated = (await res.json()) as JobOpportunity;
          onJobUpdated?.(updated);
        }
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (res.ok) {
        const updated = (await res.json()) as JobOpportunity;
        onJobUpdated?.(updated);
      }
    } finally {
      setSavingNotes(false);
    }
  };

  const handleRunMatch = async () => {
    setMatching(true);
    setMatchError(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        throw new Error(err.message ?? "Failed to calculate match");
      }
      const updated = (await res.json()) as JobOpportunity;
      if (onJobUpdated) {
        onJobUpdated(updated);
      }
    } catch (e) {
      setMatchError(e instanceof Error ? e.message : "Matching failed");
    } finally {
      setMatching(false);
    }
  };

  const handleCreateTargetedResume = async () => {
    setCreatingResume(true);
    setCreateError(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}/targeted-resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        throw new Error(err.message ?? "Failed to create targeted resume");
      }
      const data = (await res.json()) as {
        version: ResumeVersion;
        profile: ResumeProfile;
      };
      if (onNavigateToResume) {
        onNavigateToResume(data.version, data.profile);
      }
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setCreatingResume(false);
    }
  };

  const handleTrackApplication = async (status = "saved") => {
    setTrackingLoading(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          status,
          appliedAt: status === "applied" ? new Date().toISOString() : undefined,
        }),
      });
      if (res.ok) {
        onApplicationUpdated?.();
      }
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleUpdateApplicationStatus = async (status: string) => {
    if (!trackedApplication) return;
    setTrackingLoading(true);
    try {
      const res = await fetch(`/api/applications/${trackedApplication.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          appliedAt:
            status === "applied" && !trackedApplication.appliedAt
              ? new Date().toISOString()
              : undefined,
        }),
      });
      if (res.ok) {
        onApplicationUpdated?.();
      }
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="w-full max-w-xl bg-slate-900 border-l border-white/10 h-full overflow-y-auto p-6 flex flex-col justify-between space-y-6 shadow-2xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                Job Details
              </span>
              <h2 className="text-xl font-bold text-white mt-1">{job.title}</h2>
              <div className="flex items-center gap-3 text-xs text-slate-300 mt-1">
                <span className="font-semibold text-white flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  {job.company}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {job.location}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Match Score & Insights */}
          <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Match Intelligence Engine
              </span>
              <div className="flex items-center gap-2">
                {job.matchScore != null && <JobMatchBadge score={job.matchScore} />}
                <button
                  type="button"
                  onClick={() => {
                    void handleRunMatch();
                  }}
                  disabled={matching}
                  className="px-2.5 py-1 rounded bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-200 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {matching ? "Matching..." : job.matchScore != null ? "Re-calculate" : "Run Match"}
                </button>
              </div>
            </div>

            {matchError && (
              <p className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded border border-rose-500/20">
                {matchError}
              </p>
            )}

            {job.whyFits ? (
              <p className="text-xs text-slate-300 leading-relaxed">
                {job.whyFits}
              </p>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Click &quot;Run Match&quot; to evaluate compatibility against your Master Career Profile.
              </p>
            )}

            {job.matchEvidence && (
              <div className="pt-3 border-t border-indigo-500/20 space-y-2">
                <span className="text-[11px] font-bold uppercase text-slate-400 block">
                  Scoring Breakdown (Confidence: {Math.round(job.matchEvidence.confidence * 100)}%)
                </span>
                <div className="grid grid-cols-5 gap-1.5 text-center text-[10px]">
                  <div className="p-1.5 rounded bg-slate-800/80 border border-white/5">
                    <div className="text-slate-400">Skills</div>
                    <div className="font-bold text-white">{job.matchEvidence.skillScore}%</div>
                  </div>
                  <div className="p-1.5 rounded bg-slate-800/80 border border-white/5">
                    <div className="text-slate-400">Role</div>
                    <div className="font-bold text-white">{job.matchEvidence.roleScore}%</div>
                  </div>
                  <div className="p-1.5 rounded bg-slate-800/80 border border-white/5">
                    <div className="text-slate-400">Exp</div>
                    <div className="font-bold text-white">{job.matchEvidence.experienceScore}%</div>
                  </div>
                  <div className="p-1.5 rounded bg-slate-800/80 border border-white/5">
                    <div className="text-slate-400">Location</div>
                    <div className="font-bold text-white">{job.matchEvidence.locationScore}%</div>
                  </div>
                  <div className="p-1.5 rounded bg-slate-800/80 border border-white/5">
                    <div className="text-slate-400">Seniority</div>
                    <div className="font-bold text-white">{job.matchEvidence.seniorityScore}%</div>
                  </div>
                </div>

                {job.matchEvidence.reasons.length > 0 && (
                  <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside pt-1">
                    {job.matchEvidence.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Key Job Attributes */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-800/60 border border-white/5 space-y-1">
              <span className="text-slate-400 font-medium">Workplace Type</span>
              <div className="font-semibold text-white flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                {job.isRemote ? "Remote Opportunity" : "On-site / Hybrid"}
              </div>
            </div>

            {job.salaryRange && (
              <div className="p-3 rounded-lg bg-slate-800/60 border border-white/5 space-y-1">
                <span className="text-slate-400 font-medium">Salary Range</span>
                <div className="font-semibold text-white flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  {job.salaryRange}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {job.description && (
            <div className="space-y-2 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-slate-300 text-[11px]">
                Job Description
              </h4>
              <p className="text-slate-300 leading-relaxed whitespace-pre-line bg-slate-800/30 p-3 rounded-lg border border-white/5">
                {job.description}
              </p>
            </div>
          )}

          {/* Skills Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Skills Breakdown
            </h4>

            {job.requiredSkills.length > 0 && (
              <div>
                <span className="block text-xs text-slate-400 mb-1.5 font-medium">
                  ✓ Required Skills
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {job.requiredSkills.map((sk) => (
                    <span
                      key={sk}
                      className="px-2.5 py-1 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-medium"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {job.missingSkills && job.missingSkills.length > 0 && (
              <div>
                <span className="block text-xs text-slate-400 mb-1.5 font-medium">
                  • Gap / Skill Opportunities
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {job.missingSkills.map((sk) => (
                    <span
                      key={sk}
                      className="px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Application Pipeline Card */}
          <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                  Application Pipeline
                </span>
              </div>
              {trackedApplication && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 uppercase">
                  {trackedApplication.status}
                </span>
              )}
            </div>

            {trackedApplication ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-300">
                  This job is currently tracked in your CRM pipeline. Update status:
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(["saved", "applied", "screening", "interview", "offer", "rejected"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        void handleUpdateApplicationStatus(s);
                      }}
                      disabled={trackingLoading || trackedApplication.status === s}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-all disabled:opacity-60 ${
                        trackedApplication.status === s
                          ? "bg-cyan-500 text-slate-950 font-bold"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-white/10"
                      }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 pt-1">
                <p className="text-xs text-slate-400">
                  Track this role in your pipeline to log notes, interview stages, and outcomes.
                </p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      void handleTrackApplication("saved");
                    }}
                    disabled={trackingLoading}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10 transition-colors disabled:opacity-50"
                  >
                    {trackingLoading ? "Saving..." : "Save to Pipeline"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleTrackApplication("applied");
                    }}
                    disabled={trackingLoading}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20 transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mark Applied
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Notes Section */}
          <div className="space-y-2 pt-3 border-t border-white/5">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Personal Notes & Strategy
              </h4>
              <button
                type="button"
                onClick={() => {
                  void handleSaveNotes();
                }}
                disabled={savingNotes}
                className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
              >
                {savingNotes ? "Saving..." : "Save Notes"}
              </button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add key contacts, custom follow-ups, or notes for this job..."
              className="w-full h-20 p-2.5 rounded-lg bg-slate-800/60 border border-white/10 text-slate-200 text-xs focus:border-indigo-500/50 focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Action Footer */}
        <div className="pt-4 border-t border-white/10 space-y-3">
          {createError && (
            <p className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded border border-rose-500/20">
              {createError}
            </p>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void handleCreateTargetedResume();
              }}
              disabled={creatingResume}
              className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {creatingResume ? "Targeting..." : "Create Targeted Resume"}
            </button>

            <button
              type="button"
              onClick={() => {
                void handleSaveToggle();
              }}
              disabled={actionLoading}
              className={`flex items-center gap-1 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all disabled:opacity-50 ${
                isSaved
                  ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                  : "bg-slate-800 text-slate-300 border-white/10 hover:border-white/20"
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-purple-400 text-purple-400" : ""}`} />
              {isSaved ? "Saved" : "Save"}
            </button>

            <button
              type="button"
              onClick={() => {
                void handleDismissToggle();
              }}
              disabled={actionLoading}
              className={`flex items-center gap-1 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all disabled:opacity-50 ${
                isDismissed
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-slate-800 text-slate-400 border-white/10 hover:text-white hover:border-white/20"
              }`}
            >
              {isDismissed ? <RotateCcw className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {isDismissed ? "Restore" : "Dismiss"}
            </button>

            {job.sourceUrl ? (
              <a
                href={job.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-white/10 transition-all"
              >
                Apply <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

