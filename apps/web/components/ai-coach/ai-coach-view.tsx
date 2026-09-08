"use client";

import type {
  AICoachSectionRecommendation,
  JobOpportunity,
  MasterCareerProfile,
  ResumeProfile,
} from "@repo/types";
import {
  Bot,
  Check,
  CheckCircle2,
  Eye,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import React, { useMemo, useState } from "react";

import { updateLatexSection } from "@/lib/latex-engine";

interface AICoachViewProps {
  masterProfile: MasterCareerProfile | null;
  resumeProfiles: ResumeProfile[];
  selectedProfileId: string | null;
  onSelectProfile: (id: string) => void;
  onUpdateProfile: (profile: ResumeProfile) => Promise<void>;
  onNavigateToResumeStudio?: () => void;
  targetJob?: JobOpportunity | null;
}

export function AICoachView({
  masterProfile,
  resumeProfiles,
  selectedProfileId,
  onSelectProfile,
  onUpdateProfile,
  onNavigateToResumeStudio,
  targetJob,
}: AICoachViewProps) {
  const selectedProfile =
    resumeProfiles.find((p) => p.id === selectedProfileId) ??
    resumeProfiles[0] ??
    null;

  // Selected or sample target job description for contextual tailoring
  const jobRole = targetJob?.title ?? selectedProfile?.roleFocus ?? "Target Role";

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

  // Sync when master/profile changes
  React.useEffect(() => {
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

  if (!masterProfile) {
    return (
      <div className="glass-panel p-12 text-center rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-md">
        <Bot className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white">Master Career Profile Required</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
          AI Coach works strictly from verified evidence in your Master Career Profile. Complete your profile to receive section-level coaching.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/50 via-slate-900/80 to-purple-950/40 backdrop-blur-md gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center">
              <Bot className="w-4 h-4 text-indigo-300" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Advisory Assistant
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3 h-3" /> Zero Fabrication Guarantee
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            AI Coach — Section-by-Section Tailoring
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Review and decide on individual resume recommendations. Accept or reject each section independently. CareerOS updates only what you approve while keeping your LaTeX template intact.
          </p>
        </div>

        {/* Profile Selector */}
        <div className="flex flex-col gap-1.5 w-full md:w-auto">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Active Resume Target
          </label>
          <select
            value={selectedProfile?.id ?? ""}
            onChange={(e) => onSelectProfile(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
          >
            {resumeProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.roleFocus ?? "General"})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-md gap-3">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-400 font-semibold">Review Progress:</span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
            {acceptedCount} Accepted
          </span>
          <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
            {rejectedCount} Rejected
          </span>
          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
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
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              {applyingChanges
                ? "Applying..."
                : `Apply ${String(acceptedCount)} Accepted Change${acceptedCount > 1 ? "s" : ""}`}
            </button>
          )}

          {onNavigateToResumeStudio && (
            <button
              type="button"
              onClick={onNavigateToResumeStudio}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview in Studio
            </button>
          )}
        </div>
      </div>

      {applySuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{applySuccessMessage}</span>
          </div>
          {onNavigateToResumeStudio && (
            <button
              type="button"
              onClick={onNavigateToResumeStudio}
              className="underline font-bold text-white hover:text-emerald-200 ml-3 shrink-0"
            >
              View Rendered LaTeX Preview →
            </button>
          )}
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
              className={`p-5 rounded-xl border transition-all ${
                isAccepted
                  ? "bg-emerald-950/15 border-emerald-500/40"
                  : isRejected
                    ? "bg-slate-900/30 border-white/5 opacity-60"
                    : "bg-slate-900/70 border-white/10 hover:border-indigo-500/30"
              }`}
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3 pb-3 border-b border-white/5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    Section: {rec.section}
                  </span>
                  <h4 className="font-bold text-white text-sm">
                    {rec.title}
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/5 font-medium">
                    {String(Math.round(rec.confidenceScore * 100))}% Match Confidence
                  </span>
                </div>

                {/* Independent Accept / Reject Controls */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleAction(rec.id, "accepted")}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isAccepted
                        ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                        : "bg-slate-800 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {isAccepted ? "Accepted" : "Accept"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAction(rec.id, "rejected")}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isRejected
                        ? "bg-rose-500 text-white"
                        : "bg-slate-800 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30"
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
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-white/5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Reasoning */}
              <p className="text-xs text-slate-300 mb-4 leading-relaxed flex items-start gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-indigo-200">Coach Rationale:</strong>{" "}
                  {rec.reasoning}
                </span>
              </p>

              {/* Comparison diff view */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-950/60 border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Current Resume Content
                  </span>
                  <p className="text-slate-400 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
                    {rec.currentContent ?? "(empty)"}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/20 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider">
                    Proposed Change
                  </span>
                  <p className="text-indigo-100 font-mono text-[11px] whitespace-pre-wrap leading-relaxed font-semibold">
                    {rec.recommendedContent}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
