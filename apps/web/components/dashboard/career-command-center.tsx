"use client";

import type { MasterCareerProfile, ResumeProfile, ResumeVersion } from "@repo/types";
import {
  Bot,
  Briefcase,
  Compass,
  FileText,
  KeyRound,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";

import { useAuth } from "../../providers/auth-provider";
import { AICoachView } from "../ai-coach/ai-coach-view";
import { ApplicationTrackerView } from "../applications/application-tracker-view";
import { MarketInsightsView } from "../insights/market-insights-view";
import { JobBoard } from "../jobs/job-board";
import { ResumeIntelligenceView } from "../resume-intelligence/resume-intelligence-view";
import { ByokSettingsView } from "../settings/byok-settings-view";

/* ────────────────────────────────────────────────────────────────────────── */
/*  Types                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

interface ByokStatus {
  configured: boolean;
  providers: string[];
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Coming Soon Placeholder                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

function ComingSoonCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white border border-[#0f172a]/10 rounded-xl p-6 shadow-2xs">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="text-[#1d68ed]">{icon}</div>
        <h3 className="text-base font-bold text-[#0f172a]">{title}</h3>
      </div>

      <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-[#f8fafc] border border-dashed border-[#0f172a]/15 text-center">
        <div className="w-10 h-10 rounded-xl bg-[#1d68ed]/10 flex items-center justify-center text-[#1d68ed] mb-3">
          {icon}
        </div>
        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#1d68ed]/15 text-[#1d68ed] mb-2">
          Coming Soon
        </span>
        <p className="text-xs text-[#64748b] max-w-sm leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Loading Skeleton                                                         */
/* ────────────────────────────────────────────────────────────────────────── */

function DashboardSkeleton() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-[#64748b]">
      <div className="w-8 h-8 rounded-full border-2 border-[#1d68ed] border-t-transparent animate-spin" />
      <div className="text-xs font-medium">Loading your career workspace...</div>
    </div>
  );
}


/* ────────────────────────────────────────────────────────────────────────── */
/*  Main Component                                                           */
/* ────────────────────────────────────────────────────────────────────────── */

export default function CareerCommandCenter() {
  const router = useRouter();
  const { session, loading } = useAuth();

  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "resume"
    | "jobs"
    | "applications"
    | "coach"
    | "insights"
    | "settings"
  >("dashboard");
  const [coachOpen, setCoachOpen] = useState(false);
  const [targetedVersion, setTargetedVersion] = useState<ResumeVersion | null>(null);
  const [targetedProfile, setTargetedProfile] = useState<ResumeProfile | null>(null);
  const [resumeProfiles, setResumeProfiles] = useState<ResumeProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const handleNavigateToResume = (version: ResumeVersion, profile: ResumeProfile) => {
    setTargetedVersion(version);
    setTargetedProfile(profile);
    setActiveTab("resume");
  };

  const [byokStatus, setByokStatus] = useState<ByokStatus>({
    configured: false,
    providers: [],
  });
  const [profileSnapshot, setProfileSnapshot] =
    useState<MasterCareerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  /* ── Auth guard ────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
    } else if (!loading && session?.needsOnboarding) {
      router.replace("/onboarding");
    }
  }, [loading, session, router]);

  /* ── Fetch real profile snapshot ────────────────────────────────────── */

  const fetchProfileSnapshot = useCallback(async () => {
    setProfileLoading(true);
    try {
      const response = await fetch("/api/career-profile", {
        cache: "no-store",
      });

      if (response.ok) {
        const data = (await response.json()) as MasterCareerProfile;
        setProfileSnapshot(data);
      } else {
        setProfileSnapshot(null);
      }
    } catch {
      setProfileSnapshot(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  /* ── Fetch Resume Profiles ─────────────────────────────────────────── */

  const fetchResumeProfiles = useCallback(async () => {
    try {
      const response = await fetch("/api/resume-profiles", {
        cache: "no-store",
      });
      if (response.ok) {
        const data = (await response.json()) as ResumeProfile[];
        setResumeProfiles(data);
        if (data.length > 0) {
          setSelectedProfileId((prev) => prev ?? data[0]?.id ?? null);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleUpdateResumeProfile = async (profile: ResumeProfile) => {
    const res = await fetch(`/api/resume-profiles/${profile.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    if (res.ok) {
      const updated = (await res.json()) as ResumeProfile;
      setResumeProfiles((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p)),
      );
    }
  };

  /* ── Fetch BYOK status ─────────────────────────────────────────────── */

  const fetchByok = useCallback(async () => {
    try {
      const response = await fetch("/api/byok/status", { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json()) as ByokStatus;
        setByokStatus(data);
      }
    } catch {
      /* silently ignore — badge defaults to "Not Configured" */
    }
  }, []);

  useEffect(() => {
    if (session && !session.needsOnboarding) {
      void fetchProfileSnapshot();
      void fetchResumeProfiles();
      void fetchByok();
    }
  }, [session, activeTab, fetchProfileSnapshot, fetchResumeProfiles, fetchByok]);

  /* ── Loading / guard states ────────────────────────────────────────── */

  if (loading || !session) {
    return <DashboardSkeleton />;
  }

  const displayName = session.user.name ?? "there";

  /* ── Render ────────────────────────────────────────────────────────── */

  return (
    <div className="w-full space-y-6">
      {/* ── Welcome Banner ───────────────────────────────────────── */}
      <div className="bg-white border border-[#0f172a]/10 rounded-xl p-6 sm:p-8 shadow-2xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1d68ed]">
                Career Intelligence Command Center
              </span>
              <span className="w-2 h-2 rounded-full bg-[#0d9488] animate-pulse" />
            </div>
            <h2
              id="welcome-heading"
              className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0f172a]"
            >
              Welcome back, {displayName}.
            </h2>
            <p className="text-sm text-[#64748b] mt-1 max-w-xl leading-relaxed">
              Your career command center is synchronized with your Master Career Profile, verified evidence, and active job radar feeds.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-center px-4 py-2.5 rounded-lg bg-[#f8fafc] border border-[#0f172a]/10">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                Workspace
              </div>
              <div className="text-xs font-semibold text-[#0f172a] mt-0.5">
                {session.workspace.slug}
              </div>
            </div>
            <div className="text-center px-4 py-2.5 rounded-lg bg-[#f8fafc] border border-[#0f172a]/10">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                Active Account
              </div>
              <div className="text-xs font-semibold text-[#0f172a] mt-0.5 truncate max-w-[150px]">
                {session.user.email}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Telemetry Quick Stats ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => router.push("/career")}
          className="bg-white border border-[#0f172a]/10 hover:border-[#1d68ed]/40 rounded-xl p-4 text-left transition-all shadow-2xs group"
        >
          <div className="flex items-center justify-between text-[#64748b] mb-1">
            <span className="text-xs font-medium">Master Profile</span>
            <Compass className="w-4 h-4 text-[#1d68ed]" />
          </div>
          <div className="text-lg font-bold text-[#0f172a]">
            {profileSnapshot ? `${String(profileSnapshot.skills.length)} Skills` : "Empty Profile"}
          </div>
          <div className="text-[11px] text-[#64748b] mt-1 group-hover:text-[#1d68ed] transition-colors">
            {profileSnapshot ? "Verified evidence baseline" : "Configure profile →"}
          </div>
        </button>

        <button
          type="button"
          onClick={() => router.push("/jobs")}
          className="bg-white border border-[#0f172a]/10 hover:border-[#1d68ed]/40 rounded-xl p-4 text-left transition-all shadow-2xs group"
        >
          <div className="flex items-center justify-between text-[#64748b] mb-1">
            <span className="text-xs font-medium">Job Radar</span>
            <Briefcase className="w-4 h-4 text-[#1d68ed]" />
          </div>
          <div className="text-lg font-bold text-[#0f172a]">
            Active Radar
          </div>
          <div className="text-[11px] text-[#64748b] mt-1 group-hover:text-[#1d68ed] transition-colors">
            Explore live market jobs →
          </div>
        </button>

        <button
          type="button"
          onClick={() => router.push("/applications")}
          className="bg-white border border-[#0f172a]/10 hover:border-[#1d68ed]/40 rounded-xl p-4 text-left transition-all shadow-2xs group"
        >
          <div className="flex items-center justify-between text-[#64748b] mb-1">
            <span className="text-xs font-medium">Applications</span>
            <TrendingUp className="w-4 h-4 text-[#0d9488]" />
          </div>
          <div className="text-lg font-bold text-[#0f172a]">
            Pipeline CRM
          </div>
          <div className="text-[11px] text-[#64748b] mt-1 group-hover:text-[#1d68ed] transition-colors">
            Track interview stages →
          </div>
        </button>

        <button
          type="button"
          onClick={() => router.push("/settings")}
          className="bg-white border border-[#0f172a]/10 hover:border-[#1d68ed]/40 rounded-xl p-4 text-left transition-all shadow-2xs group"
        >
          <div className="flex items-center justify-between text-[#64748b] mb-1">
            <span className="text-xs font-medium">AI Readiness</span>
            <KeyRound className="w-4 h-4 text-[#1d68ed]" />
          </div>
          <div className="text-lg font-bold text-[#0f172a]">
            {byokStatus.configured ? "BYOK Active" : "Setup Keys"}
          </div>
          <div className="text-[11px] text-[#64748b] mt-1 group-hover:text-[#1d68ed] transition-colors">
            {byokStatus.configured ? `${String(byokStatus.providers.length)} provider(s) linked` : "Configure BYOK →"}
          </div>
        </button>
      </div>

      {/* ── Subviews (if triggered) or Main Command Center Grid ─────── */}
      {activeTab === "resume" ? (
        <ResumeIntelligenceView
          initialVersion={targetedVersion}
          initialProfile={targetedProfile}
        />
      ) : activeTab === "jobs" ? (
        <JobBoard onNavigateToResume={handleNavigateToResume} />
      ) : activeTab === "applications" ? (
        <ApplicationTrackerView
          onGoToJobs={() => router.push("/jobs")}
        />
      ) : activeTab === "coach" ? (
        <AICoachView
          masterProfile={profileSnapshot}
          resumeProfiles={resumeProfiles}
          selectedProfileId={selectedProfileId}
          onSelectProfile={setSelectedProfileId}
          onUpdateProfile={handleUpdateResumeProfile}
          onNavigateToResumeStudio={() => router.push("/resumes")}
        />
      ) : activeTab === "insights" ? (
        <MarketInsightsView masterProfile={profileSnapshot} />
      ) : activeTab === "settings" ? (
        <ByokSettingsView />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Left Column (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Profile Snapshot Card */}
            <div className="bg-white border border-[#0f172a]/10 rounded-xl p-6 shadow-2xs">
              <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-[#0f172a]/8">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#1d68ed]/10 flex items-center justify-center text-[#1d68ed]">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0f172a]">
                      Profile Snapshot
                    </h3>
                    <p className="text-xs text-[#64748b]">
                      Your canonical career evidence anchor
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => router.push("/career")}
                  className="text-xs font-semibold text-[#1d68ed] hover:text-[#1555c8] hover:underline"
                >
                  Edit Profile →
                </button>
              </div>

              {profileLoading ? (
                <div className="text-xs text-[#64748b] py-6 text-center">
                  Loading profile evidence…
                </div>
              ) : profileSnapshot ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-lg bg-[#f8fafc] border border-[#0f172a]/8">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                      Full Name
                    </div>
                    <div className="font-semibold text-sm text-[#0f172a] mt-1">
                      {profileSnapshot.identity.fullName}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-lg bg-[#f8fafc] border border-[#0f172a]/8">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                      Headline
                    </div>
                    <div className="font-semibold text-sm text-[#0f172a] mt-1 truncate">
                      {profileSnapshot.identity.headline ?? "Add headline"}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-lg bg-[#f8fafc] border border-[#0f172a]/8">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                      Location
                    </div>
                    <div className="font-semibold text-sm text-[#0f172a] mt-1 truncate">
                      {profileSnapshot.identity.location ?? "Add location"}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-lg bg-[#f8fafc] border border-[#0f172a]/8">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                      Profile Version
                    </div>
                    <div className="font-semibold text-sm text-[#0f172a] mt-1">
                      Version #{profileSnapshot.version}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-lg bg-[#f8fafc] text-center space-y-2">
                  <p className="text-xs text-[#64748b]">
                    No master profile has been established for this workspace yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push("/career")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1d68ed] text-white text-xs font-medium hover:bg-[#1555c8] transition-colors shadow-2xs"
                  >
                    Establish Career Profile
                  </button>
                </div>
              )}
            </div>

            {/* Explainable AI Recommendations */}
            <ComingSoonCard
              icon={<Sparkles className="w-4 h-4 text-[#1d68ed]" />}
              title="Explainable AI Recommendations"
              description="Connect an AI provider via BYOK in Settings to unlock personalized, explainable recommendations powered strictly by your verified Master Career Profile."
            />
          </div>

          {/* Right Column (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Quick-access to Job Radar */}
            <div className="bg-white border border-[#0f172a]/10 rounded-xl p-6 shadow-2xs">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#1d68ed]/10 flex items-center justify-center text-[#1d68ed]">
                  <Briefcase className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[#0f172a]">
                  Job Radar
                </h3>
              </div>
              <p className="text-xs text-[#64748b] leading-relaxed mb-4">
                Discover, filter, and track live opportunities matched deterministically against your verified competencies.
              </p>
              <button
                type="button"
                onClick={() => router.push("/jobs")}
                className="w-full py-2.5 rounded-lg bg-[#1d68ed] text-white font-semibold text-xs hover:bg-[#1555c8] transition-colors shadow-2xs"
              >
                Open Job Radar →
              </button>
            </div>

            {/* Quick-access to Applications */}
            <div className="bg-white border border-[#0f172a]/10 rounded-xl p-6 shadow-2xs">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#0d9488]/10 flex items-center justify-center text-[#0d9488]">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[#0f172a]">
                  Application Pipeline
                </h3>
              </div>
              <p className="text-xs text-[#64748b] leading-relaxed mb-4">
                Monitor submissions from discovery through interview and offer with persistent notes and version history.
              </p>
              <button
                type="button"
                onClick={() => router.push("/applications")}
                className="w-full py-2.5 rounded-lg border border-[#0f172a]/15 bg-white text-[#0f172a] font-semibold text-xs hover:bg-[#f8fafc] transition-colors shadow-2xs"
              >
                View Pipeline →
              </button>
            </div>

            {/* Quick-access to AI Coach */}
            <div className="bg-white border border-[#0f172a]/10 rounded-xl p-6 shadow-2xs">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#0f172a]/10 flex items-center justify-center text-[#0f172a]">
                  <Bot className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[#0f172a]">
                  AI Career Coach
                </h3>
              </div>
              <p className="text-xs text-[#64748b] leading-relaxed mb-4">
                Receive section-level critique and resume sharpening grounded in your verified career evidence.
              </p>
              <button
                type="button"
                onClick={() => router.push("/coach")}
                className="w-full py-2.5 rounded-lg bg-[#0f172a] text-white font-semibold text-xs hover:bg-[#0b2227] transition-colors shadow-2xs"
              >
                Launch AI Coach →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════ AI Coach Drawer ═══════════════════ */}
      {coachOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(6px)",
            zIndex: 50,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              width: "480px",
              height: "100%",
              backgroundColor: "#0f172a",
              borderLeft: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              flexDirection: "column",
              boxShadow: "-10px 0 30px rgba(0,0,0,0.5)",
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: "1.25rem 1.5rem",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Bot
                  style={{ width: "20px", height: "20px", color: "#818cf8" }}
                />
                <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>
                  AI Career Coach
                </h3>
              </div>
              <button
                id="close-ai-coach"
                onClick={() => {
                  setCoachOpen(false);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: "1.25rem",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* AI requires BYOK */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "2rem",
                textAlign: "center",
                gap: "1.25rem",
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "16px",
                  background:
                    "linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bot
                  style={{ width: "32px", height: "32px", color: "#818cf8" }}
                />
              </div>

              <div>
                <h4
                  style={{
                    fontSize: "1.15rem",
                    fontWeight: "700",
                    marginBottom: "0.5rem",
                  }}
                >
                  AI Career Coach
                </h4>
                {byokStatus.configured ? (
                  <p
                    style={{
                      color: "#94a3b8",
                      fontSize: "0.85rem",
                      lineHeight: "1.6",
                      maxWidth: "320px",
                    }}
                  >
                    AI provider is configured. Conversational coaching will be available in an upcoming release.
                  </p>
                ) : (
                  <>
                    <p
                      style={{
                        color: "#94a3b8",
                        fontSize: "0.85rem",
                        lineHeight: "1.6",
                        maxWidth: "320px",
                        marginBottom: "1rem",
                      }}
                    >
                      AI-assisted insights require a configured provider. Add your API key in BYOK settings to enable personalized coaching.
                    </p>
                    <div
                      style={{
                        padding: "0.75rem 1rem",
                        borderRadius: "0.75rem",
                        backgroundColor: "rgba(245, 158, 11, 0.08)",
                        border: "1px solid rgba(245, 158, 11, 0.2)",
                        color: "#fbbf24",
                        fontSize: "0.8rem",
                        maxWidth: "320px",
                      }}
                    >
                      Configure OpenAI or Anthropic via BYOK settings to unlock AI features.
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
