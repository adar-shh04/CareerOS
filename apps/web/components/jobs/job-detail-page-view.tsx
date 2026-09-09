"use client";

import type { JobOpportunity, ResumeProfile, ResumeVersion } from "@repo/types";
import {
  ArrowLeft,
  Bookmark,
  Building2,
  CheckCircle2,
  ExternalLink,
  EyeOff,
  FileCode,
  Loader2,
  MapPin,
  RotateCcw,
  Sparkles,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";

import type { TrackedApplication } from "@/lib/api";

import { JobMatchBadge } from "./job-match-badge";

interface JobDetailPageViewProps {
  jobId: string;
}

export function JobDetailPageView({ jobId }: JobDetailPageViewProps) {
  const router = useRouter();
  const [job, setJob] = useState<JobOpportunity | null>(null);
  const [trackedApplication, setTrackedApplication] =
    useState<TrackedApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [matching, setMatching] = useState(false);
  const [creatingResume, setCreatingResume] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchJobData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Job opportunity not found.");
      }
      const data = (await res.json()) as JobOpportunity;
      setJob(data);
      setNotes(data.workspaceState?.notes ?? "");

      // Fetch tracking state
      const appsRes = await fetch("/api/applications", { cache: "no-store" });
      if (appsRes.ok) {
        const apps = (await appsRes.json()) as TrackedApplication[];
        const matchApp = apps.find((a) => a.jobId === jobId);
        setTrackedApplication(matchApp ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load job details.");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void fetchJobData();
  }, [fetchJobData]);

  const handleSaveToggle = async () => {
    if (!job) return;
    setActionLoading(true);
    try {
      const isSaved = job.workspaceState?.isSaved;
      if (isSaved) {
        const res = await fetch(`/api/jobs/${job.id}/state`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isSaved: false, status: "discovered" }),
        });
        if (res.ok) {
          const updated = (await res.json()) as JobOpportunity;
          setJob(updated);
        }
      } else {
        const res = await fetch(`/api/jobs/${job.id}/save`, { method: "POST" });
        if (res.ok) {
          const updated = (await res.json()) as JobOpportunity;
          setJob(updated);
        }
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDismissToggle = async () => {
    if (!job) return;
    setActionLoading(true);
    try {
      const isDismissed = job.workspaceState?.isDismissed;
      const endpoint = isDismissed ? "restore" : "dismiss";
      const res = await fetch(`/api/jobs/${job.id}/${endpoint}`, {
        method: "POST",
      });
      if (res.ok) {
        const updated = (await res.json()) as JobOpportunity;
        setJob(updated);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunMatch = async () => {
    if (!job) return;
    setMatching(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}/match`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to compute match.");
      const updated = (await res.json()) as JobOpportunity;
      setJob(updated);
      setActionSuccess("Deterministic match scores recalculated.");
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Match calculation failed.");
    } finally {
      setMatching(false);
    }
  };

  const handleCreateTargetedResume = async () => {
    if (!job) return;
    setCreatingResume(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}/targeted-resume`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(body.message ?? "Failed to create targeted resume.");
      }
      const data = (await res.json()) as {
        version: ResumeVersion;
        profile: ResumeProfile;
      };
      setActionSuccess("Targeted Resume Version created!");
      // Navigate to the created version
      router.push(
        `/resumes/${data.profile.id}/versions/${data.version.id}`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create targeted resume version.",
      );
    } finally {
      setCreatingResume(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!job) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (res.ok) {
        setActionSuccess("Notes saved.");
        setTimeout(() => setActionSuccess(null), 2500);
      }
    } finally {
      setSavingNotes(false);
    }
  };

  const handleUpdateApplicationStatus = async (status: string) => {
    if (!job) return;
    setActionLoading(true);
    try {
      if (trackedApplication) {
        const res = await fetch(`/api/applications/${trackedApplication.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (res.ok) {
          const updated = (await res.json()) as TrackedApplication;
          setTrackedApplication(updated);
        }
      } else {
        const res = await fetch("/api/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: job.id, status }),
        });
        if (res.ok) {
          const created = (await res.json()) as TrackedApplication;
          setTrackedApplication(created);
        }
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin text-[#1d68ed]" />
        <span className="text-xs">Loading opportunity details...</span>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto rounded-xl border border-slate-200/80 bg-white p-8 text-center space-y-4 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900">Opportunity Not Found</h2>
        <p className="text-xs text-slate-500">
          The requested job posting may have expired or does not exist.
        </p>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] px-4 py-2 text-xs font-semibold text-white transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Job Radar
        </Link>
      </div>
    );
  }

  const isSaved = job.workspaceState?.isSaved ?? false;
  const isDismissed = job.workspaceState?.isDismissed ?? false;
  const matchResult = job.match;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Job Radar</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {/* Match Trigger */}
          <button
            type="button"
            disabled={matching}
            onClick={() => void handleRunMatch()}
            className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 px-3 py-1.5 text-xs font-medium text-[#1d68ed] transition-colors cursor-pointer disabled:opacity-50"
          >
            {matching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            <span>Re-match Score</span>
          </button>

          {/* Save Button */}
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => void handleSaveToggle()}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors shadow-2xs cursor-pointer ${
              isSaved
                ? "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span>{isSaved ? "Saved" : "Save Opportunity"}</span>
          </button>

          {/* Dismiss / Restore Button */}
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => void handleDismissToggle()}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors shadow-2xs cursor-pointer ${
              isDismissed
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            {isDismissed ? (
              <>
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restore</span>
              </>
            ) : (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                <span>Dismiss</span>
              </>
            )}
          </button>

          {/* Create Targeted Resume */}
          <button
            type="button"
            disabled={creatingResume}
            onClick={() => void handleCreateTargetedResume()}
            className="flex items-center gap-1.5 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {creatingResume ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileCode className="h-3.5 w-3.5" />
            )}
            <span>Target Resume for this Role</span>
          </button>

          {/* External Posting Link */}
          {job.sourceUrl && (
            <a
              href={job.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-colors"
            >
              <span>View Source</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      {actionSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 shadow-2xs">
          {error}
        </div>
      )}

      {/* Main Job Hero Header */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {job.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                <Building2 className="h-4 w-4 text-[#1d68ed]" />
                {job.company}
              </span>
              <span className="flex items-center gap-1 text-slate-500">
                <MapPin className="h-3.5 w-3.5 text-slate-500" />
                {job.location}
              </span>
              {job.isRemote && (
                <span className="rounded-full border border-blue-200/80 bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-[#1d68ed]">
                  Remote Policy: {job.remotePolicy ?? "Remote"}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {(job.matchScore != null || matchResult?.overallScore != null) && (
              <JobMatchBadge score={job.matchScore ?? matchResult?.overallScore ?? 0} />
            )}
          </div>
        </div>

        {/* Metadata pill grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div>
            <span className="text-slate-500 block text-[11px]">Salary Range</span>
            <span className="text-slate-900 font-medium">
              {job.salaryRange ?? "Not Disclosed"}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Employment Type</span>
            <span className="text-slate-900 font-medium">
              {job.employmentType ?? "Full-time"}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Source Adapter</span>
            <span className="text-slate-900 font-medium uppercase tracking-wider text-[10px]">
              {job.source}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Posting Date</span>
            <span className="text-slate-900 font-medium">
              {job.postedAt
                ? new Date(job.postedAt).toLocaleDateString()
                : "Recently Added"}
            </span>
          </div>
        </div>
      </div>

      {/* Match Explainability Panel */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 space-y-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#1d68ed]" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Deterministic Fit Breakdown
            </h2>
          </div>
          {matchResult && (
            <span className="text-xs text-slate-500">
              Confidence: {Math.round(matchResult.confidence * 100)}%
            </span>
          )}
        </div>

        {/* Explanation text */}
        <div className="rounded-xl border border-blue-100 bg-[#f4f8ff] p-4 text-xs text-slate-800 leading-relaxed">
          {job.whyFits ??
            matchResult?.explanation ??
            "Match analysis evaluates your Master Career Profile skills, title similarity, and experience against the requirements of this role."}
        </div>

        {/* Dimension scores */}
        {matchResult?.dimensionScores && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3">
              <div className="text-slate-500 text-[11px]">Skills Match</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {Math.round(matchResult.dimensionScores.skill * 100)}%
              </div>
            </div>
            <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3">
              <div className="text-slate-500 text-[11px]">Role Relevance</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {Math.round(matchResult.dimensionScores.role * 100)}%
              </div>
            </div>
            <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3">
              <div className="text-slate-500 text-[11px]">Experience Depth</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {Math.round(matchResult.dimensionScores.experience * 100)}%
              </div>
            </div>
            <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3">
              <div className="text-slate-500 text-[11px]">Location Alignment</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {Math.round(matchResult.dimensionScores.location * 100)}%
              </div>
            </div>
            <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3">
              <div className="text-slate-500 text-[11px]">Seniority Score</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {Math.round(matchResult.dimensionScores.seniority * 100)}%
              </div>
            </div>
          </div>
        )}

        {/* Matched vs Missing Skills breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Matched Verified Skills
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(matchResult?.matchedSkills ?? []).length > 0 ? (
                matchResult?.matchedSkills.map((s, idx) => (
                  <span
                    key={idx}
                    className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-800 font-medium"
                  >
                    {s}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 italic text-[11px]">
                  No exact skills overlap detected.
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-amber-800 font-semibold flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-amber-600" /> Missing / Gap Requirements
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(matchResult?.missingSkills ?? job.missingSkills ?? []).length > 0 ? (
                (matchResult?.missingSkills ?? job.missingSkills ?? []).map(
                  (s, idx) => (
                    <span
                      key={idx}
                      className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-amber-900 font-medium"
                    >
                      {s}
                    </span>
                  ),
                )
              ) : (
                <span className="text-slate-400 italic text-[11px]">
                  All required skills found in your master profile.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Application Tracking Status & Notes */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Application Lifecycle
            </h3>
            <p className="text-xs text-slate-500">
              Track your stage in the hiring process for this specific opportunity.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {[
              { id: "saved", label: "Saved" },
              { id: "applied", label: "Applied" },
              { id: "screening", label: "Screening" },
              { id: "interview", label: "Interview" },
              { id: "offer", label: "Offer" },
            ].map((stage) => {
              const isActive = trackedApplication?.status === stage.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => void handleUpdateApplicationStatus(stage.id)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors shadow-2xs cursor-pointer ${
                    isActive
                      ? "border-blue-200 bg-blue-50 text-[#1d68ed] font-semibold"
                      : "border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {stage.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2 pt-2">
          <label className="text-xs text-slate-700 font-medium">
            Internal Opportunity Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Recruiter contacts, interview questions, research links, compensation notes..."
            className="w-full h-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 text-xs focus:border-[#1d68ed] focus:bg-white focus:ring-2 focus:ring-[#1d68ed]/20 focus:outline-none resize-none leading-relaxed placeholder:text-slate-400"
          />
          <div className="flex justify-end">
            <button
              type="button"
              disabled={savingNotes}
              onClick={() => void handleSaveNotes()}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {savingNotes ? "Saving Notes..." : "Save Notes"}
            </button>
          </div>
        </div>
      </div>

      {/* Full Job Description */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 sm:p-8 space-y-4 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">
          Role Description & Requirements
        </h3>
        <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-sans space-y-3">
          {job.description ?? "No detailed description provided by the source adapter."}
        </div>
      </div>
    </div>
  );
}
