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
import Link from "next/link";
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
  isInline?: boolean;
}

export function JobDetailsDrawer({
  job,
  trackedApplication,
  onClose,
  onJobUpdated,
  onApplicationUpdated,
  onNavigateToResume,
  isInline = false,
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

  const content = (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1d68ed]">
                Job Details
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">{job.title}</h2>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-[#1d68ed]" />
                  {job.company}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {job.location}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link
                href={`/jobs/${job.id}`}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                title="Open standalone job page"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close drawer"
                title="Close drawer"
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Match Score & Insights */}
          <div className="p-4 rounded-xl border border-blue-100 bg-[#f4f8ff] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1d68ed]">
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
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 border border-blue-200 text-[#1d68ed] text-xs font-semibold transition-colors disabled:opacity-50 shadow-2xs cursor-pointer"
                >
                  {matching ? "Matching..." : job.matchScore != null ? "Re-calculate" : "Run Match"}
                </button>
              </div>
            </div>

            {matchError && (
              <p className="text-xs text-rose-700 bg-rose-50 p-2 rounded border border-rose-200">
                {matchError}
              </p>
            )}

            {job.whyFits ? (
              <p className="text-xs text-slate-700 leading-relaxed">
                {job.whyFits}
              </p>
            ) : (
              <p className="text-xs text-slate-500 italic">
                Click &quot;Run Match&quot; to evaluate compatibility against your Master Career Profile.
              </p>
            )}

            {job.matchEvidence && (
              <div className="pt-3 border-t border-blue-100 space-y-2">
                <span className="text-[11px] font-bold uppercase text-slate-500 block">
                  Scoring Breakdown (Confidence: {Math.round(job.matchEvidence.confidence * 100)}%)
                </span>
                <div className="grid grid-cols-5 gap-1.5 text-center text-[10px]">
                  <div className="p-1.5 rounded-lg bg-white border border-slate-200/80">
                    <div className="text-slate-500">Skills</div>
                    <div className="font-bold text-slate-900">{job.matchEvidence.skillScore}%</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-white border border-slate-200/80">
                    <div className="text-slate-500">Role</div>
                    <div className="font-bold text-slate-900">{job.matchEvidence.roleScore}%</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-white border border-slate-200/80">
                    <div className="text-slate-500">Exp</div>
                    <div className="font-bold text-slate-900">{job.matchEvidence.experienceScore}%</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-white border border-slate-200/80">
                    <div className="text-slate-500">Location</div>
                    <div className="font-bold text-slate-900">{job.matchEvidence.locationScore}%</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-white border border-slate-200/80">
                    <div className="text-slate-500">Seniority</div>
                    <div className="font-bold text-slate-900">{job.matchEvidence.seniorityScore}%</div>
                  </div>
                </div>

                {job.matchEvidence.reasons.length > 0 && (
                  <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside pt-1">
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
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
              <span className="text-slate-500 font-medium">Workplace Type</span>
              <div className="font-semibold text-slate-900 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                {job.isRemote ? "Remote Opportunity" : "On-site / Hybrid"}
              </div>
            </div>

            {job.salaryRange && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                <span className="text-slate-500 font-medium">Salary Range</span>
                <div className="font-semibold text-slate-900 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  {job.salaryRange}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {job.description && (
            <div className="space-y-2 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-slate-900 text-[11px]">
                Job Description
              </h4>
              <p className="text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
                {job.description}
              </p>
            </div>
          )}

          {/* Skills Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Skills Breakdown
            </h4>

            {job.requiredSkills.length > 0 && (
              <div>
                <span className="block text-xs text-slate-500 mb-1.5 font-medium">
                  ✓ Required Skills
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {job.requiredSkills.map((sk) => (
                    <span
                      key={sk}
                      className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-[#1d68ed] text-xs font-medium"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {job.missingSkills && job.missingSkills.length > 0 && (
              <div>
                <span className="block text-xs text-slate-500 mb-1.5 font-medium">
                  • Gap / Skill Opportunities
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {job.missingSkills.map((sk) => (
                    <span
                      key={sk}
                      className="px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Application Pipeline Card */}
          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#1d68ed]" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Application Pipeline
                </span>
              </div>
              {trackedApplication && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#1d68ed] border border-blue-200 uppercase">
                  {trackedApplication.status}
                </span>
              )}
            </div>

            {trackedApplication ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">
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
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all disabled:opacity-60 cursor-pointer ${
                        trackedApplication.status === s
                          ? "bg-[#1d68ed] text-white font-bold shadow-xs"
                          : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                      }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 pt-1">
                <p className="text-xs text-slate-500">
                  Track this role in your pipeline to log notes, interview stages, and outcomes.
                </p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      void handleTrackApplication("saved");
                    }}
                    disabled={trackingLoading}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {trackingLoading ? "Saving..." : "Save to Pipeline"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleTrackApplication("applied");
                    }}
                    disabled={trackingLoading}
                    className="px-3 py-1.5 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mark Applied
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Notes Section */}
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Personal Notes &amp; Strategy
              </h4>
              <button
                type="button"
                onClick={() => {
                  void handleSaveNotes();
                }}
                disabled={savingNotes}
                className="text-[11px] font-semibold text-[#1d68ed] hover:text-[#1555c8] disabled:opacity-50 cursor-pointer"
              >
                {savingNotes ? "Saving..." : "Save Notes"}
              </button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add key contacts, custom follow-ups, or notes for this job..."
              className="w-full h-20 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-[#1d68ed] focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Action Footer */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          {createError && (
            <p className="text-xs text-rose-700 bg-rose-50 p-2 rounded border border-rose-200">
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
              className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
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
              className={`flex items-center gap-1 px-3 py-2.5 rounded-lg border text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer ${
                isSaved
                  ? "bg-purple-50 text-purple-700 border-purple-300"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-purple-500 text-purple-600" : ""}`} />
              {isSaved ? "Saved" : "Save"}
            </button>

            <button
              type="button"
              onClick={() => {
                void handleDismissToggle();
              }}
              disabled={actionLoading}
              className={`flex items-center gap-1 px-3 py-2.5 rounded-lg border text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer ${
                isDismissed
                  ? "bg-amber-50 text-amber-700 border-amber-300"
                  : "bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-50"
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
                className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 transition-all"
              >
                Apply <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : null}
          </div>
        </div>
    </>
  );

  if (isInline) {
    return (
      <div className="w-full bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col justify-between space-y-6 shadow-xs sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end transition-opacity">
      <div className="w-full max-w-xl bg-white border-l border-slate-200 h-full overflow-y-auto p-6 flex flex-col justify-between space-y-6 shadow-2xl">
        {content}
      </div>
    </div>
  );
}

