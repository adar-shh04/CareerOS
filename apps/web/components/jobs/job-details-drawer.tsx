"use client";

import type { JobOpportunity, ResumeProfile, ResumeVersion } from "@repo/types";
import { Building2, Calendar, CheckCircle2, DollarSign, ExternalLink, Globe, MapPin, X, Bookmark, Sparkles, FileText } from "lucide-react";
import React, { useState } from "react";

import { JobMatchBadge } from "./job-match-badge";

interface JobDetailsDrawerProps {
  job: JobOpportunity | null;
  onClose: () => void;
  onJobUpdated?: (updatedJob: JobOpportunity) => void;
  onNavigateToResume?: (version: ResumeVersion, profile: ResumeProfile) => void;
}

export function JobDetailsDrawer({ job, onClose, onJobUpdated, onNavigateToResume }: JobDetailsDrawerProps) {
  const [saved, setSaved] = useState(false);
  const [matching, setMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [creatingResume, setCreatingResume] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  if (!job) return null;

  const handleRunMatch = async () => {
    setMatching(true);
    setMatchError(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to calculate match");
      }
      const updated: JobOpportunity = await res.json();
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
        const err = await res.json();
        throw new Error(err.message || "Failed to create targeted resume");
      }
      const data = await res.json();
      if (onNavigateToResume) {
        onNavigateToResume(data.version, data.profile);
      }
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setCreatingResume(false);
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
                  onClick={handleRunMatch}
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
                Click "Run Match" to evaluate compatibility against your Master Career Profile.
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

            {job.requiredSkills && job.requiredSkills.length > 0 && (
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
        </div>

        {/* Action Footer */}
        <div className="pt-4 border-t border-white/10 space-y-3">
          {createError && (
            <p className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded border border-rose-500/20">
              {createError}
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCreateTargetedResume}
              disabled={creatingResume}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {creatingResume ? "Creating Targeted Resume..." : "Create Targeted Resume"}
            </button>

            <button
              type="button"
              onClick={() => setSaved(!saved)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                saved
                  ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                  : "bg-slate-800 text-slate-300 border-white/10 hover:border-white/20"
              }`}
            >
              <Bookmark className="w-4 h-4" />
              {saved ? "Saved" : "Save Job"}
            </button>

            {job.sourceUrl ? (
              <a
                href={job.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-white/10 transition-all"
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

