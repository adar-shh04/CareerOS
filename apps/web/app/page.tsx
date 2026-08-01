"use client";

import type { MasterCareerProfile } from "@repo/types";
import {
  Bot,
  BrainCircuit,
  Briefcase,
  Compass,
  FileText,
  KeyRound,
  LogOut,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";

import { ResumeIntelligenceView } from "../components/resume-intelligence/resume-intelligence-view";
import { useAuth } from "../providers/auth-provider";

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
    <div className="glass-panel" style={{ padding: "1.5rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          marginBottom: "1rem",
        }}
      >
        {icon}
        <h3 style={{ fontSize: "1.05rem", fontWeight: "700" }}>{title}</h3>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2.5rem 1.5rem",
          borderRadius: "0.75rem",
          backgroundColor: "rgba(15, 23, 42, 0.6)",
          border: "1px dashed rgba(255, 255, 255, 0.1)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "rgba(99, 102, 241, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1rem",
          }}
        >
          {icon}
        </div>
        <span
          style={{
            display: "inline-block",
            padding: "0.25rem 0.75rem",
            borderRadius: "999px",
            fontSize: "0.7rem",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            backgroundColor: "rgba(99, 102, 241, 0.12)",
            color: "#818cf8",
            marginBottom: "0.75rem",
          }}
        >
          Coming Soon
        </span>
        <p
          style={{
            color: "#94a3b8",
            fontSize: "0.85rem",
            lineHeight: "1.5",
            maxWidth: "320px",
          }}
        >
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
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#080b11",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "10px",
          background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 30px rgba(99, 102, 241, 0.4)",
        }}
      >
        <BrainCircuit
          style={{ width: "22px", height: "22px", color: "#ffffff" }}
        />
      </div>
      <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
        Loading your command center…
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Main Component                                                           */
/* ────────────────────────────────────────────────────────────────────────── */

export default function CareerCommandCenter() {
  const router = useRouter();
  const { session, loading, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<
    "dashboard" | "resume" | "jobs" | "coach" | "skills"
  >("dashboard");
  const [coachOpen, setCoachOpen] = useState(false);

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
      void fetchByok();
    }
  }, [session, fetchByok, fetchProfileSnapshot]);

  /* ── Loading / guard states ────────────────────────────────────────── */

  if (loading || !session) {
    return <DashboardSkeleton />;
  }

  const displayName = session.user.name ?? "there";

  /* ── Render ────────────────────────────────────────────────────────── */

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#080b11",
        color: "#f8fafc",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ═══════════════════════ Top Header ═══════════════════════ */}
      <header
        style={{
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          backgroundColor: "rgba(11, 15, 25, 0.8)",
          backdropFilter: "blur(12px)",
          padding: "1rem 2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "2.5rem" }}>
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 20px rgba(99, 102, 241, 0.4)",
              }}
            >
              <BrainCircuit
                style={{ width: "20px", height: "20px", color: "#ffffff" }}
              />
            </div>
            <div>
              <h1
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "700",
                  letterSpacing: "-0.02em",
                }}
              >
                CareerOS
              </h1>
              <span
                style={{
                  fontSize: "0.65rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#6366f1",
                  fontWeight: "700",
                }}
              >
                AI Operating System v1.0
              </span>
            </div>
          </div>

          <nav style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {[
              { id: "dashboard", label: "Command Center", icon: Compass },
              { id: "resume", label: "Resume Intelligence", icon: FileText },
              { id: "jobs", label: "Job Radar", icon: Briefcase },
              { id: "coach", label: "AI Mentor", icon: Sparkles },
              { id: "skills", label: "Skill Roadmap", icon: Target },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => {
                    setActiveTab(
                      item.id as
                        | "dashboard"
                        | "resume"
                        | "jobs"
                        | "coach"
                        | "skills",
                    );
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 0.85rem",
                    borderRadius: "0.5rem",
                    fontSize: "0.85rem",
                    fontWeight: isActive ? "600" : "500",
                    color: isActive ? "#ffffff" : "#94a3b8",
                    backgroundColor: isActive
                      ? "rgba(99, 102, 241, 0.15)"
                      : "transparent",
                    border: isActive
                      ? "1px solid rgba(99, 102, 241, 0.3)"
                      : "1px solid transparent",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <Icon
                    style={{
                      width: "16px",
                      height: "16px",
                      color: isActive ? "#818cf8" : "#64748b",
                    }}
                  />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* BYOK Badge — real status */}
          <div
            id="byok-badge"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.35rem 0.75rem",
              borderRadius: "2rem",
              backgroundColor: byokStatus.configured
                ? "rgba(16, 185, 129, 0.1)"
                : "rgba(148, 163, 184, 0.08)",
              border: byokStatus.configured
                ? "1px solid rgba(16, 185, 129, 0.2)"
                : "1px solid rgba(148, 163, 184, 0.15)",
            }}
          >
            <KeyRound
              style={{
                width: "14px",
                height: "14px",
                color: byokStatus.configured ? "#10b981" : "#64748b",
              }}
            />
            <span
              style={{
                fontSize: "0.75rem",
                color: byokStatus.configured ? "#10b981" : "#94a3b8",
                fontWeight: "600",
              }}
            >
              {byokStatus.configured
                ? `BYOK Active · ${byokStatus.providers.join(", ")}`
                : "BYOK Not Configured"}
            </span>
          </div>

          {/* AI Coach Drawer Button */}
          <button
            id="open-ai-coach"
            onClick={() => {
              setCoachOpen(true);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
              color: "#ffffff",
              fontWeight: "600",
              fontSize: "0.85rem",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(99, 102, 241, 0.3)",
            }}
          >
            <Bot style={{ width: "16px", height: "16px" }} />
            AI Coach
          </button>

          {/* Logout Button */}
          <button
            id="logout-button"
            onClick={() => void logout()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.5rem 0.85rem",
              borderRadius: "0.5rem",
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#94a3b8",
              fontSize: "0.8rem",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <LogOut style={{ width: "14px", height: "14px" }} />
            Sign out
          </button>
        </div>
      </header>

      {/* ═══════════════════════ Main Content ═══════════════════════ */}
      <main
        style={{
          flex: 1,
          padding: "2rem",
          maxWidth: "1400px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* ── Welcome Banner ───────────────────────────────────────── */}
        <div
          className="glass-panel"
          style={{
            padding: "1.75rem 2rem",
            marginBottom: "2rem",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "300px",
              height: "100%",
              background:
                "radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(0,0,0,0) 70%)",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.35rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    color: "#818cf8",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Career Intelligence
                </span>
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: "#10b981",
                  }}
                />
              </div>
              <h2
                id="welcome-heading"
                style={{
                  fontSize: "1.75rem",
                  fontWeight: "700",
                  letterSpacing: "-0.02em",
                }}
              >
                Welcome back, {displayName}.{" "}
                <span className="gradient-text">
                  {session.workspace.name}
                </span>
              </h2>
              <p
                style={{
                  color: "#94a3b8",
                  fontSize: "0.9rem",
                  marginTop: "0.35rem",
                }}
              >
                Your career command center is ready. Enable modules below as
                they become available.
              </p>
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <div
                style={{
                  textAlign: "center",
                  padding: "0.75rem 1.25rem",
                  borderRadius: "0.75rem",
                  backgroundColor: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "0.25rem",
                  }}
                >
                  Workspace
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    color: "#cbd5e1",
                  }}
                >
                  {session.workspace.slug}
                </div>
              </div>
              <div
                style={{
                  textAlign: "center",
                  padding: "0.75rem 1.25rem",
                  borderRadius: "0.75rem",
                  backgroundColor: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "0.25rem",
                  }}
                >
                  Email
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    color: "#cbd5e1",
                  }}
                >
                  {session.user.email}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Dashboard Grid or Resume Intelligence ─────────────────── */}
        {activeTab === "resume" ? (
          <ResumeIntelligenceView />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(12, 1fr)",
              gap: "1.5rem",
            }}
          >
            <div
              style={{
                gridColumn: "span 8",
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    marginBottom: "1rem",
                  }}
                >
                  <FileText
                    style={{ width: "18px", height: "18px", color: "#a855f7" }}
                  />
                  <h3 style={{ fontSize: "1.05rem", fontWeight: "700" }}>
                    Profile Snapshot
                  </h3>
                </div>

                {profileLoading ? (
                  <div style={{ color: "#94a3b8" }}>
                    Loading your profile…
                  </div>
                ) : profileSnapshot ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: "1rem",
                    }}
                  >
                    <div
                      style={{
                        padding: "1rem",
                        borderRadius: "0.9rem",
                        backgroundColor: "rgba(15, 23, 42, 0.6)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div style={{ color: "#64748b", fontSize: "0.72rem" }}>
                        Full name
                      </div>
                      <div style={{ fontWeight: "700", marginTop: "0.35rem" }}>
                        {profileSnapshot.identity.fullName}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "1rem",
                        borderRadius: "0.9rem",
                        backgroundColor: "rgba(15, 23, 42, 0.6)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div style={{ color: "#64748b", fontSize: "0.72rem" }}>
                        Headline
                      </div>
                      <div style={{ fontWeight: "700", marginTop: "0.35rem" }}>
                        {profileSnapshot.identity.headline ?? "Add a headline"}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "1rem",
                        borderRadius: "0.9rem",
                        backgroundColor: "rgba(15, 23, 42, 0.6)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div style={{ color: "#64748b", fontSize: "0.72rem" }}>
                        Location
                      </div>
                      <div style={{ fontWeight: "700", marginTop: "0.35rem" }}>
                        {profileSnapshot.identity.location ?? "Add a location"}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "1rem",
                        borderRadius: "0.9rem",
                        backgroundColor: "rgba(15, 23, 42, 0.6)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div style={{ color: "#64748b", fontSize: "0.72rem" }}>
                        Version
                      </div>
                      <div style={{ fontWeight: "700", marginTop: "0.35rem" }}>
                        {profileSnapshot.version}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "#94a3b8" }}>
                    No master profile has been saved for this workspace yet.
                    Open Resume Intelligence to create one.
                  </div>
                )}
              </div>

              <ComingSoonCard
                icon={
                  <Sparkles
                    style={{ width: "18px", height: "18px", color: "#818cf8" }}
                  />
                }
                title="Explainable AI Recommendations"
                description="Connect an AI provider via BYOK to unlock personalized, explainable career recommendations powered by your Master Career Profile."
              />
            </div>

            <div
              style={{
                gridColumn: "span 4",
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              <ComingSoonCard
                icon={
                  <Briefcase
                    style={{ width: "18px", height: "18px", color: "#22d3ee" }}
                  />
                }
                title="Intelligent Job Radar"
                description="The Job Intelligence module will ingest, normalize, deduplicate, and rank job opportunities tailored to your profile and preferences."
              />

              <ComingSoonCard
                icon={
                  <TrendingUp
                    style={{ width: "18px", height: "18px", color: "#10b981" }}
                  />
                }
                title="Application CRM"
                description="Track the complete lifecycle of each application — from discovery through interviews to outcomes — in one unified view."
              />
            </div>
          </div>
        )}
      </main>

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

            {/* Coming Soon Content */}
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
                <span
                  style={{
                    display: "inline-block",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "999px",
                    fontSize: "0.7rem",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    backgroundColor: "rgba(99, 102, 241, 0.12)",
                    color: "#818cf8",
                    marginBottom: "0.75rem",
                  }}
                >
                  Coming Soon
                </span>
                <h4
                  style={{
                    fontSize: "1.15rem",
                    fontWeight: "700",
                    marginBottom: "0.5rem",
                  }}
                >
                  AI Career Coach
                </h4>
                <p
                  style={{
                    color: "#94a3b8",
                    fontSize: "0.85rem",
                    lineHeight: "1.6",
                    maxWidth: "320px",
                  }}
                >
                  Your personal AI career advisor will provide resume
                  optimization, skill gap analysis, and interview preparation —
                  powered by your own AI keys via BYOK.
                </p>
              </div>

              {!byokStatus.configured && (
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
                  Configure an AI provider key in Settings to enable this
                  feature when it launches.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
