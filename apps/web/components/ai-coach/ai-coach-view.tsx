"use client";

import type {
  AiCoachSection,
  AICoachSectionRecommendation,
  JobOpportunity,
  MasterCareerProfile,
  ResumeProfile,
  SectionCoachingResponse,
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
import React, { useCallback, useEffect, useState } from "react";

export interface AICoachViewProps {
  masterProfile?: MasterCareerProfile | null;
  resumeProfiles?: ResumeProfile[];
  selectedProfileId?: string | null;
  onSelectProfile?: (id: string) => void;
  onUpdateProfile?: (profile: ResumeProfile) => Promise<void>;
  onNavigateToResumeStudio?: () => void;
  targetJob?: JobOpportunity | null;
}

/**
 * A recommendation card. `source: "ai"` comes from the AI Coach API (validated
 * server-side); `source: "evidence"` is derived deterministically from stored
 * Master Career Profile data and only reorders existing records — it never
 * writes new claims.
 */
type CoachRecommendation = AICoachSectionRecommendation & {
  source: "ai" | "evidence";
  /** Master record ids to prioritize when applied. */
  selectedRecordIds?: string[];
  /** Whether accepting writes recommendedContent into the resume's LaTeX section. */
  appliesContent: boolean;
};

const AI_SECTIONS: AiCoachSection[] = ["summary", "skills", "experience", "projects"];

const SECTION_TITLES: Record<AiCoachSection, string> = {
  summary: "Tailor Summary for the Target Role",
  skills: "Tailor Skills for the Target Role",
  experience: "Tailor Experience for the Target Role",
  projects: "Tailor Projects for the Target Role",
  education: "Tailor Education for the Target Role",
};

/** Current resume content for a section, taken from real stored data only. */
function currentSectionContent(
  section: AiCoachSection,
  master: MasterCareerProfile,
  profile: ResumeProfile | null,
): string | undefined {
  switch (section) {
    case "summary":
      return profile?.summaryGuidance ?? master.identity.headline;
    case "skills":
      return master.skills.map((s) => s.name).join(", ") || undefined;
    case "experience":
      return (
        master.experiences
          .map((e) =>
            [`${e.title} — ${e.company}`, ...(e.bullets ?? []).map((b) => `- ${b}`)].join("\n"),
          )
          .join("\n\n") || undefined
      );
    case "projects":
      return master.projects.map((p) => p.name).join("\n") || undefined;
    default:
      return undefined;
  }
}

/**
 * Deterministic, evidence-only recommendations (used when AI is unavailable):
 * prioritize skills and a project the target job actually asks for. Nothing is
 * suggested without a concrete overlap in stored data.
 */
function buildEvidenceRecommendations(
  master: MasterCareerProfile,
  targetJob: JobOpportunity | null,
): CoachRecommendation[] {
  if (!targetJob) return [];
  const jobSkills = new Set(
    [...targetJob.requiredSkills, ...targetJob.preferredSkills].map((s) =>
      s.trim().toLowerCase(),
    ),
  );
  const recs: CoachRecommendation[] = [];

  const matchingSkills = master.skills.filter((s) =>
    jobSkills.has(s.name.trim().toLowerCase()),
  );
  if (matchingSkills.length > 0) {
    const ordered = [
      ...matchingSkills,
      ...master.skills.filter((s) => !matchingSkills.includes(s)),
    ];
    recs.push({
      id: "evidence-skills",
      source: "evidence",
      section: "skills",
      title: "Lead with skills this role asks for",
      reasoning: `${targetJob.title} at ${targetJob.company} lists ${matchingSkills
        .map((s) => s.name)
        .join(", ")}, which are in your Master Career Profile. Reorders existing skills only.`,
      currentContent: master.skills.map((s) => s.name).join(", "),
      recommendedContent: ordered.map((s) => s.name).join(", "),
      selectedRecordIds: matchingSkills.map((s) => s.id),
      appliesContent: false,
      status: "pending",
    });
  }

  const rankedProjects = master.projects
    .map((p) => ({
      project: p,
      overlap: (p.technologies ?? []).filter((t) =>
        jobSkills.has(t.trim().toLowerCase()),
      ),
    }))
    .filter((r) => r.overlap.length > 0)
    .sort((a, b) => b.overlap.length - a.overlap.length);
  const topProject = rankedProjects[0];
  if (topProject) {
    recs.push({
      id: "evidence-projects",
      source: "evidence",
      section: "projects",
      title: `Lead with project "${topProject.project.name}"`,
      reasoning: `"${topProject.project.name}" uses ${topProject.overlap.join(", ")}, which ${targetJob.title} at ${targetJob.company} lists. Reorders existing projects only.`,
      currentContent: master.projects.map((p) => p.name).join("\n"),
      recommendedContent: `Prioritize: ${topProject.project.name}`,
      selectedRecordIds: [topProject.project.id],
      appliesContent: false,
      status: "pending",
    });
  }

  return recs;
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
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

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

      if (resumesRes.ok) {
        const profilesList = (await resumesRes.json()) as ResumeProfile[];
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

  const activeTargetJob = props.targetJob !== undefined ? props.targetJob : internalTargetJob;

  const selectedProfile =
    resumeProfiles.find((p) => p.id === selectedProfileId) ??
    resumeProfiles[0] ??
    null;

  // Selected or sample target job description for contextual tailoring
  const jobRole = activeTargetJob?.title ?? selectedProfile?.roleFocus ?? "Target Role";

  const [recommendations, setRecommendations] = useState<CoachRecommendation[]>([]);

  // Request section recommendations from the AI Coach API. Each result is
  // validated server-side; failures are surfaced, never replaced with
  // generated text. Without AI, fall back to evidence-only reorderings.
  const selectedProfileKey = selectedProfile?.id ?? null;
  const targetJobKey = activeTargetJob?.id ?? null;
  useEffect(() => {
    if (!masterProfile) {
      setRecommendations([]);
      return;
    }
    // Ignore responses from a superseded request (profile/job changed).
    const run = { cancelled: false };
    setLoadingRecommendations(true);
    setAiNotice(null);

    void (async () => {
      const results = await Promise.all(
        AI_SECTIONS.map(async (section) => {
          try {
            const res = await fetch("/api/ai-coach/section", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                section,
                jobId: targetJobKey ?? undefined,
                targetRole: jobRole,
                resumeProfileId: selectedProfileKey ?? undefined,
              }),
            });
            const data = (await res.json().catch(() => ({}))) as SectionCoachingResponse & {
              message?: string;
            };
            return res.ok
              ? { section, data }
              : {
                  section,
                  data: {
                    available: false,
                    failureReason: "provider_error" as const,
                    message: data.message ?? "AI Coach request failed.",
                  },
                };
          } catch {
            return {
              section,
              data: {
                available: false,
                failureReason: "provider_error" as const,
                message: "Network error while contacting AI Coach.",
              },
            };
          }
        }),
      );
      if (run.cancelled) return;

      const notConfigured = results.every(
        (r) => !r.data.available && r.data.failureReason === "not_configured",
      );

      if (notConfigured) {
        setAiAvailable(false);
        setRecommendations(buildEvidenceRecommendations(masterProfile, activeTargetJob));
      } else {
        setAiAvailable(true);
        const recs: CoachRecommendation[] = [];
        const failed: string[] = [];
        for (const { section, data } of results) {
          const rec = data.recommendation;
          if (!data.available || !rec) {
            failed.push(section);
            continue;
          }
          const skillIds =
            section === "skills"
              ? masterProfile.skills
                  .filter((s) =>
                    rec.recommendedContent
                      .split(/[,\n]/)
                      .map((n) => n.replace(/^[-*•]\s*/, "").trim().toLowerCase())
                      .includes(s.name.trim().toLowerCase()),
                  )
                  .map((s) => s.id)
              : undefined;
          recs.push({
            id: `ai-${section}`,
            source: "ai",
            section,
            title: SECTION_TITLES[section],
            reasoning: rec.explanation,
            currentContent: currentSectionContent(section, masterProfile, selectedProfile),
            recommendedContent: rec.recommendedContent,
            selectedRecordIds: skillIds,
            appliesContent: true,
            status: "pending",
          });
        }
        setRecommendations(recs);
        if (failed.length > 0) {
          setAiNotice(
            `AI Coach could not produce a usable recommendation for: ${failed.join(", ")}. Nothing was generated for ${failed.length > 1 ? "those sections" : "that section"}.`,
          );
        }
      }
      setLoadingRecommendations(false);
    })();

    return () => {
      run.cancelled = true;
    };
    // Re-run only when the inputs to coaching change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterProfile, selectedProfileKey, targetJobKey]);

  const [applyingChanges, setApplyingChanges] = useState(false);
  const [applySuccessMessage, setApplySuccessMessage] = useState<string | null>(
    null,
  );
  const [applyErrorMessage, setApplyErrorMessage] = useState<string | null>(null);

  const handleAction = (
    id: string,
    action: "accepted" | "rejected" | "pending",
  ) => {
    setRecommendations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: action } : r)),
    );
  };

  // Accepted recommendations are applied by the API (shared LaTeX contract),
  // one section at a time. Only the Resume Profile changes; every failure is
  // reported instead of claiming success.
  const handleApplyAccepted = async () => {
    if (!selectedProfile) return;
    const accepted = recommendations.filter((r) => r.status === "accepted");
    if (accepted.length === 0) return;

    setApplyingChanges(true);
    setApplySuccessMessage(null);
    setApplyErrorMessage(null);

    const failures: string[] = [];
    let latestProfile: ResumeProfile | null = null;

    try {
      for (const rec of accepted) {
        try {
          const res = await fetch("/api/ai-coach/apply-section", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              resumeProfileId: selectedProfile.id,
              section: rec.section,
              content: rec.appliesContent ? rec.recommendedContent : undefined,
              selectedRecordIds: rec.selectedRecordIds,
            }),
          });
          const data = (await res.json().catch(() => ({}))) as {
            profile?: ResumeProfile;
            message?: string;
          };
          if (!res.ok) {
            failures.push(`${rec.section}: ${data.message ?? `HTTP ${String(res.status)}`}`);
          } else if (data.profile) {
            latestProfile = data.profile;
          }
        } catch {
          failures.push(`${rec.section}: network error`);
        }
      }

      const appliedCount = accepted.length - failures.length;
      if (latestProfile) {
        if (props.onUpdateProfile) {
          await props.onUpdateProfile(latestProfile);
        } else {
          const res = await fetch("/api/resume-profiles", { cache: "no-store" });
          if (res.ok) {
            setInternalProfiles((await res.json()) as ResumeProfile[]);
          }
        }
      }

      if (appliedCount > 0) {
        setApplySuccessMessage(
          `Applied ${String(appliedCount)} of ${String(accepted.length)} accepted change${accepted.length > 1 ? "s" : ""} to "${selectedProfile.name}". Master Career Profile unchanged.`,
        );
        setTimeout(() => setApplySuccessMessage(null), 5000);
      }
      if (failures.length > 0) {
        setApplyErrorMessage(`Not applied — ${failures.join("; ")}`);
      }
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
              <strong>Deterministic Evidence Mode:</strong> No AI provider is configured, so no content is written for you. Suggestions below only reorder skills and projects the target job asks for. Configure BYOK API keys in Settings to enable AI section coaching.
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

          {applyErrorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs shadow-2xs">
              {applyErrorMessage}
            </div>
          )}

          {aiNotice && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs shadow-2xs">
              {aiNotice}
            </div>
          )}

          {loadingRecommendations ? (
            <div className="flex items-center justify-center gap-2 p-8 rounded-xl border border-slate-200/80 bg-white text-xs text-slate-500 shadow-xs">
              <Loader2 className="w-4 h-4 animate-spin text-[#1d68ed]" />
              Preparing section recommendations…
            </div>
          ) : recommendations.length === 0 ? (
            <div className="p-8 rounded-xl border border-slate-200/80 bg-white text-center text-xs text-slate-500 shadow-xs">
              {aiAvailable === false
                ? "No evidence-based suggestions for this target: none of your recorded skills or project technologies appear in the selected job."
                : "No recommendations are available right now."}
            </div>
          ) : null}

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
                        {rec.source === "ai" ? "AI suggestion" : "From your profile evidence"}
                      </span>
                      {rec.confidenceScore !== undefined && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                          {String(Math.round(rec.confidenceScore * 100))}% Match Confidence
                        </span>
                      )}
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
