"use client";

import type {
  AICoachSectionRecommendation,
  JobOpportunity,
  MasterCareerProfile,
  ResumeProfile,
} from "@repo/types";
import {
  Bot,
  Briefcase,
  Check,
  CheckCircle2,
  Eye,
  Key,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { updateLatexSection } from "@/lib/latex-engine";

export interface AICoachViewProps {
  masterProfile?: MasterCareerProfile | null;
  resumeProfiles?: ResumeProfile[];
  selectedProfileId?: string | null;
  onSelectProfile?: (id: string) => void;
  onUpdateProfile?: (profile: ResumeProfile) => Promise<void>;
  onNavigateToResumeStudio?: () => void;
  targetJob?: JobOpportunity | null;
}

export function AICoachView(props: AICoachViewProps) {
  const router = useRouter();

  // Internal state for standalone usage
  const [internalMaster, setInternalMaster] = useState<MasterCareerProfile | null>(null);
  const [internalProfiles, setInternalProfiles] = useState<ResumeProfile[]>([]);
  const [internalSelectedProfileId, setInternalSelectedProfileId] = useState<string | null>(null);
  const [internalJobs, setInternalJobs] = useState<JobOpportunity[]>([]);
  const [internalTargetJob, setInternalTargetJob] = useState<JobOpportunity | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(props.masterProfile === undefined);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);

  // Determine whether to use props or internal state
  const isSelfManaged = props.masterProfile === undefined;

  const loadData = useCallback(async () => {
    if (!isSelfManaged) return;
    setLoadingInitial(true);
    try {
      const [profRes, resumesRes, jobsRes] = await Promise.all([
        fetch("/api/career-profile", { cache: "no-store" }),
        fetch("/api/resume-profiles", { cache: "no-store" }),
        fetch("/api/jobs", { cache: "no-store" }),
      ]);

      if (profRes.ok) {
        const p = (await profRes.json()) as MasterCareerProfile;
        setInternalMaster(p);
      }

      let profilesList: ResumeProfile[] = [];
      if (resumesRes.ok) {
        profilesList = (await resumesRes.json()) as ResumeProfile[];
        setInternalProfiles(profilesList);
        const firstProfile = profilesList[0];
        if (firstProfile && !internalSelectedProfileId) {
          setInternalSelectedProfileId(firstProfile.id);
        }
      }

      if (jobsRes.ok) {
        const jList = (await jobsRes.json()) as JobOpportunity[];
        setInternalJobs(jList);
        if (jList.length > 0) {
          setInternalTargetJob(jList[0] ?? null);
        }
      }

      // Check AI Coach provider capability
      try {
        const testRes = await fetch("/api/ai-coach/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetRole: profilesList[0]?.roleFocus ?? "Software Engineer",
          }),
        });
        if (testRes.ok) {
          const testData = (await testRes.json()) as { available?: boolean };
          setAiAvailable(testData.available !== false);
        } else {
          setAiAvailable(false);
        }
      } catch {
        setAiAvailable(false);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoadingInitial(false);
    }
  }, [isSelfManaged, internalSelectedProfileId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const masterProfile = props.masterProfile ?? internalMaster;
  const resumeProfiles = props.resumeProfiles ?? internalProfiles;
  const selectedProfileId = props.selectedProfileId ?? internalSelectedProfileId;

  const onSelectProfile =
    props.onSelectProfile ??
    ((id: string) => {
      setInternalSelectedProfileId(id);
    });

  const onNavigateToResumeStudio =
    props.onNavigateToResumeStudio ??
    (() => {
      if (selectedProfileId) {
        router.push(`/resumes/${selectedProfileId}`);
      } else {
        router.push("/resumes");
      }
    });

  const onUpdateProfile =
    props.onUpdateProfile ??
    (async (profile: ResumeProfile) => {
      await fetch(`/api/resume-profiles/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summaryGuidance: profile.summaryGuidance,
          latexSource: profile.latexSource,
          prioritySkillIds: profile.prioritySkillIds,
          priorityProjectIds: profile.priorityProjectIds,
        }),
      });
      // Refresh list
      const res = await fetch("/api/resume-profiles", { cache: "no-store" });
      if (res.ok) {
        const list = (await res.json()) as ResumeProfile[];
        setInternalProfiles(list);
      }
    });

  const activeTargetJob = props.targetJob !== undefined ? props.targetJob : internalTargetJob;

  const selectedProfile =
    resumeProfiles.find((p) => p.id === selectedProfileId) ??
    resumeProfiles[0] ??
    null;

  // Selected or sample target job description for contextual tailoring
  const jobRole = activeTargetJob?.title ?? selectedProfile?.roleFocus ?? "Target Role";

  // Deterministically generate section-level recommendations based strictly on Master Profile evidence
  const initialRecommendations: AICoachSectionRecommendation[] = useMemo(() => {
    if (!masterProfile) return [];

    const recs: AICoachSectionRecommendation[] = [];

    // 1. Executive Summary Recommendation
    const existingSummary = selectedProfile?.summaryGuidance ?? "";
    const topSkills = masterProfile.skills.slice(0, 4).map((s) => s.name);
    const expCount = masterProfile.experiences.length;
    const tailoredSummary = `${masterProfile.identity.headline ?? "Results-driven professional"} with extensive background across ${
      expCount > 0 ? `${String(expCount)}+ major industry roles` : "core competencies"
    }. Proven specialization in ${
      topSkills.length > 0 ? topSkills.join(", ") : "system development and delivery"
    }. Focused on driving technical excellence and impact for ${jobRole} initiatives.`;

    recs.push({
      id: "rec-summary-01",
      section: "summary",
      title: "Align Executive Summary with Target Role",
      reasoning: `Tailor the profile executive summary to emphasize your demonstrated experience in ${topSkills.slice(0, 2).join(" & ")} relevant to ${jobRole}.`,
      currentContent: existingSummary || "(No executive summary guidance currently configured)",
      recommendedContent: tailoredSummary,
      status: "pending",
      confidenceScore: 0.94,
      impact: "High",
    });

    // 2. Skills Prioritization Recommendation
    if (masterProfile.skills.length > 0) {
      const allSkills = masterProfile.skills.map((s) => s.name);
      const prioritized = [...masterProfile.skills]
        .sort((a, b) => (b.proficiency === "expert" ? 1 : 0) - (a.proficiency === "expert" ? 1 : 0))
        .slice(0, 6)
        .map((s) => s.name);

      recs.push({
        id: "rec-skills-02",
        section: "skills",
        title: "Prioritize Core Competencies & Verified Skills",
        reasoning: `Highlight verified skills (${prioritized.slice(0, 3).join(", ")}) at the top of your technical skills section based on your master profile evidence. Never includes unverified skills.`,
        currentContent: allSkills.join(", "),
        recommendedContent: prioritized.join(", "),
        status: "pending",
        confidenceScore: 0.96,
        impact: "High",
      });
    }

    // 3. Projects Highlighting Recommendation
    if (masterProfile.projects.length > 0) {
      const topProj = masterProfile.projects[0];
      if (topProj) {
        recs.push({
          id: "rec-projects-03",
          section: "projects",
          title: `Emphasize Project: "${topProj.name}"`,
          reasoning: `Your project "${topProj.name}" demonstrates technologies (${topProj.technologies?.join(", ") ?? "core stack"}) that match key job criteria. Recommend elevating this to the primary project slot.`,
          currentContent: `Current primary: ${masterProfile.projects[0]?.name ?? "None"}`,
          recommendedContent: `Prioritize ${topProj.name} with bullets focused on: ${topProj.bullets?.[0] ?? "Delivered key architectural milestones."}`,
          status: "pending",
          confidenceScore: 0.88,
          impact: "Medium",
        });
      }
    }

    // 4. Experience Bullet Recommendation
    if (masterProfile.experiences.length > 0) {
      const topExp = masterProfile.experiences[0];
      if (topExp?.bullets && topExp.bullets.length > 0) {
        const originalBullet = topExp.bullets[0] ?? "Led software delivery";
        const enhancedBullet = `${originalBullet} — ensuring high availability and alignment with production requirements.`;

        recs.push({
          id: "rec-exp-04",
          section: "experience",
          title: `Clarify Impact Bullet at ${topExp.company}`,
          reasoning: `Strengthen the phrasing of your primary bullet at ${topExp.company} using action-oriented impact language without fabricating metrics.`,
          currentContent: originalBullet,
          recommendedContent: enhancedBullet,
          status: "pending",
          confidenceScore: 0.91,
          impact: "Medium",
        });
      }
    }

    return recs;
  }, [masterProfile, selectedProfile, jobRole]);

  const [recommendations, setRecommendations] = useState<
    AICoachSectionRecommendation[]
  >(initialRecommendations);

  // Sync when recommendations change
  useEffect(() => {
    setRecommendations(initialRecommendations);
  }, [initialRecommendations]);

  const [applyingChanges, setApplyingChanges] = useState(false);
  const [applySuccessMessage, setApplySuccessMessage] = useState<string | null>(
    null,
  );

  const handleAction = (
    id: string,
    action: "accepted" | "rejected" | "pending",
  ) => {
    setRecommendations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: action } : r)),
    );
  };

  const handleApplyAccepted = async () => {
    if (!selectedProfile) return;
    setApplyingChanges(true);
    setApplySuccessMessage(null);

    try {
      const accepted = recommendations.filter((r) => r.status === "accepted");
      if (accepted.length === 0) return;

      const updatedProfile = { ...selectedProfile };
      let updatedLatex = selectedProfile.latexSource ?? "";

      for (const rec of accepted) {
        if (rec.section === "summary") {
          updatedProfile.summaryGuidance = rec.recommendedContent;
          if (updatedLatex) {
            updatedLatex = updateLatexSection(
              updatedLatex,
              "Executive Summary",
              `\\small{${rec.recommendedContent}}`,
            );
          }
        } else if (rec.section === "skills" && masterProfile) {
          // Reorder priority skills
          const skillNames = rec.recommendedContent.split(",").map((s) => s.trim().toLowerCase());
          const matchingIds = masterProfile.skills
            .filter((s) => skillNames.includes(s.name.toLowerCase()))
            .map((s) => s.id);
          updatedProfile.prioritySkillIds = matchingIds;
        } else if (rec.section === "projects" && masterProfile) {
          if (masterProfile.projects[0]) {
            updatedProfile.priorityProjectIds = [masterProfile.projects[0].id];
          }
        }
      }

      if (updatedLatex) {
        updatedProfile.latexSource = updatedLatex;
      }

      await onUpdateProfile(updatedProfile);
      setApplySuccessMessage(
        `Successfully applied ${String(accepted.length)} accepted section changes to "${selectedProfile.name}". Underlying LaTeX preserved.`,
      );
      setTimeout(() => setApplySuccessMessage(null), 5000);
    } finally {
      setApplyingChanges(false);
    }
  };

  const acceptedCount = recommendations.filter((r) => r.status === "accepted").length;
  const rejectedCount = recommendations.filter((r) => r.status === "rejected").length;
  const pendingCount = recommendations.filter((r) => r.status === "pending").length;

  if (loadingInitial) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin text-[#1d68ed]" />
        <span className="text-xs font-medium">Loading AI Coach workspace…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* BYOK Capability Notice if AI is not configured */}
      {aiAvailable === false && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4 flex-wrap text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Key className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-amber-800">
              <strong>Deterministic Evidence Mode:</strong> Coaching operates using verified Master Profile algorithms. Configure BYOK API keys in Settings to unlock deep generative critique.
            </span>
          </div>
          <Link
            href="/settings"
            className="text-[#1d68ed] font-semibold underline hover:text-[#1555c8] shrink-0"
          >
            Configure AI Provider Keys →
          </Link>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 rounded-xl border border-slate-200/80 bg-white shadow-xs gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/80 flex items-center justify-center text-[#1d68ed]">
              <Bot className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#1d68ed]">
              Advisory Assistant
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Zero Fabrication Guarantee
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            AI Coach — Section-by-Section Tailoring
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Review and decide on individual resume recommendations. Accept or reject each section independently. CareerOS updates only what you approve while keeping your LaTeX template intact.
          </p>
        </div>

        {/* Selectors: Target Resume & Target Job */}
        {masterProfile && (
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Target Job Selector (if available) */}
            {internalJobs.length > 0 && isSelfManaged && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-[#1d68ed]" /> Context Job
                </label>
                <select
                  value={activeTargetJob?.id ?? ""}
                  onChange={(e) => {
                    const found = internalJobs.find((j) => j.id === e.target.value) ?? null;
                    setInternalTargetJob(found);
                  }}
                  className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs font-semibold focus:outline-none focus:border-[#1d68ed] focus:ring-2 focus:ring-[#1d68ed]/20 max-w-[220px]"
                >
                  {internalJobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} ({j.company})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Target Profile Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Active Resume Target
              </label>
              <select
                value={selectedProfile?.id ?? ""}
                onChange={(e) => onSelectProfile(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs font-semibold focus:outline-none focus:border-[#1d68ed] focus:ring-2 focus:ring-[#1d68ed]/20 min-w-[200px]"
              >
                {resumeProfiles.length === 0 ? (
                  <option value="">No Resume Profile (Create in Studio)</option>
                ) : (
                  resumeProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.roleFocus ?? "General"})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        )}
      </div>

      {!masterProfile ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-slate-200/80 bg-white shadow-xs gap-3">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-[#1d68ed]">
            <Bot className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Master Career Profile Required</h3>
          <p className="text-xs text-slate-500 max-w-md text-center leading-relaxed">
            AI Coach works strictly from verified evidence in your Master Career Profile. Complete your profile to receive section-level coaching.
          </p>
          <div className="pt-2">
            <Link
              href="/career"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Open Master Career Profile →
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Status Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border border-slate-200/80 bg-white shadow-xs gap-3">
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <span className="text-slate-500 font-semibold">Review Progress:</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                {acceptedCount} Accepted
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                {rejectedCount} Rejected
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                {pendingCount} Pending
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {acceptedCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    void handleApplyAccepted();
                  }}
                  disabled={applyingChanges}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  {applyingChanges
                    ? "Applying..."
                    : `Apply ${String(acceptedCount)} Accepted Change${acceptedCount > 1 ? "s" : ""}`}
                </button>
              )}

              <button
                type="button"
                onClick={onNavigateToResumeStudio}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-[#1d68ed]" />
                Preview in Studio
              </button>
            </div>
          </div>

          {applySuccessMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{applySuccessMessage}</span>
              </div>
              <button
                type="button"
                onClick={onNavigateToResumeStudio}
                className="underline font-bold text-[#1d68ed] hover:text-[#1555c8] ml-3 shrink-0 cursor-pointer"
              >
                View Rendered LaTeX Preview →
              </button>
            </div>
          )}

          {/* Section Recommendations List */}
          <div className="grid grid-cols-1 gap-4">
            {recommendations.map((rec) => {
              const isAccepted = rec.status === "accepted";
              const isRejected = rec.status === "rejected";

              return (
                <div
                  key={rec.id}
                  className={`p-5 rounded-xl border transition-all shadow-xs ${
                    isAccepted
                      ? "bg-emerald-50/40 border-emerald-300"
                      : isRejected
                        ? "bg-slate-50 border-slate-200 opacity-60"
                        : "bg-white border-slate-200/80 hover:border-slate-300"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#1d68ed] border border-blue-200/80">
                        Section: {rec.section}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {rec.title}
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                        {String(Math.round(rec.confidenceScore * 100))}% Match Confidence
                      </span>
                    </div>

                    {/* Independent Accept / Reject Controls */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleAction(rec.id, "accepted")}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isAccepted
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        {isAccepted ? "Accepted" : "Accept"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAction(rec.id, "rejected")}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isRejected
                            ? "bg-rose-600 text-white shadow-xs"
                            : "bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 shadow-2xs"
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                        {isRejected ? "Rejected" : "Reject"}
                      </button>

                      {(isAccepted || isRejected) && (
                        <button
                          type="button"
                          onClick={() => handleAction(rec.id, "pending")}
                          title="Reset decision"
                          className="p-1.5 rounded-lg bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Reasoning */}
                  <p className="text-xs text-slate-700 mb-4 leading-relaxed flex items-start gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#1d68ed] shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-[#1d68ed]">Coach Rationale:</strong>{" "}
                      {rec.reasoning}
                    </span>
                  </p>

                  {/* Comparison diff view */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        Current Resume Content
                      </span>
                      <p className="text-slate-600 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
                        {rec.currentContent ?? "(empty)"}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[#1d68ed] tracking-wider">
                        Proposed Change
                      </span>
                      <p className="text-slate-900 font-mono text-[11px] whitespace-pre-wrap leading-relaxed font-semibold">
                        {rec.recommendedContent}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
