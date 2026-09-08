"use client";

import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  History,
  Loader2,
  Save,
  Trash2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";

import type {
  ApplicationStatusHistory,
  TrackedApplication,
} from "@/lib/api";

type ApplicationStatus =
  | "saved"
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

const STAGES: { key: ApplicationStatus; label: string; color: string; bg: string; border: string }[] = [
  {
    key: "saved",
    label: "Saved",
    color: "#818cf8",
    bg: "rgba(99,102,241,0.12)",
    border: "rgba(99,102,241,0.3)",
  },
  {
    key: "applied",
    label: "Applied",
    color: "#22d3ee",
    bg: "rgba(34,211,238,0.12)",
    border: "rgba(34,211,238,0.3)",
  },
  {
    key: "screening",
    label: "Screening",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.3)",
  },
  {
    key: "interview",
    label: "Interview",
    color: "#a855f7",
    bg: "rgba(168,85,247,0.12)",
    border: "rgba(168,85,247,0.3)",
  },
  {
    key: "offer",
    label: "Offer",
    color: "#10b981",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.3)",
  },
  {
    key: "rejected",
    label: "Rejected",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.2)",
  },
  {
    key: "withdrawn",
    label: "Withdrawn",
    color: "#64748b",
    bg: "rgba(100,116,139,0.08)",
    border: "rgba(100,116,139,0.2)",
  },
];

interface ApplicationDetailViewProps {
  applicationId: string;
}

export function ApplicationDetailView({ applicationId }: ApplicationDetailViewProps) {
  const router = useRouter();
  const [app, setApp] = useState<TrackedApplication | null>(null);
  const [history, setHistory] = useState<ApplicationStatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [notes, setNotes] = useState("");
  const [appliedAt, setAppliedAt] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Application not found or could not be loaded.");
      }
      const data = (await res.json()) as TrackedApplication;
      setApp(data);
      setNotes(data.notes ?? "");
      setAppliedAt(
        data.appliedAt
          ? new Date(data.appliedAt).toISOString().split("T")[0] ?? ""
          : "",
      );

      // Load status history
      setHistoryLoading(true);
      const histRes = await fetch(`/api/applications/${applicationId}/history`, {
        cache: "no-store",
      });
      if (histRes.ok) {
        const histData = (await histRes.json()) as ApplicationStatusHistory[];
        setHistory(histData);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load application.");
    } finally {
      setLoading(false);
      setHistoryLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleStatusChange = async (newStatus: ApplicationStatus) => {
    if (!app || app.status === newStatus) return;

    // Optimistic
    setApp({ ...app, status: newStatus });

    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        await loadData();
      } else {
        // Refresh history
        const histRes = await fetch(`/api/applications/${applicationId}/history`, {
          cache: "no-store",
        });
        if (histRes.ok) {
          const histData = (await histRes.json()) as ApplicationStatusHistory[];
          setHistory(histData);
        }
      }
    } catch {
      await loadData();
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    setNotesSaved(false);
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: notes.trim(),
          appliedAt: appliedAt ? new Date(appliedAt).toISOString() : null,
        }),
      });
      if (res.ok) {
        setNotesSaved(true);
        setTimeout(() => setNotesSaved(false), 3000);
      }
    } catch {
      // ignore
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to remove this application from your pipeline?")) {
      return;
    }
    try {
      await fetch(`/api/applications/${applicationId}`, { method: "DELETE" });
      router.push("/applications");
    } catch {
      alert("Failed to delete application.");
    }
  };

  if (loading) {
    return (
      <div
        style={{
          padding: "4rem",
          textAlign: "center",
          color: "#94a3b8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
        }}
      >
        <Loader2
          style={{
            width: "18px",
            height: "18px",
            animation: "spin 1s linear infinite",
          }}
        />
        Loading application workspace…
      </div>
    );
  }

  if (error || !app) {
    return (
      <div style={{ maxWidth: "600px", margin: "2rem auto", padding: "1.5rem" }}>
        <div
          style={{
            padding: "1.5rem",
            borderRadius: "0.75rem",
            backgroundColor: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#ef4444",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          <XCircle style={{ width: "20px", height: "20px", flexShrink: 0 }} />
          <span>{error ?? "Application not found"}</span>
        </div>
        <Link
          href="/applications"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.85rem",
            color: "#818cf8",
            textDecoration: "none",
          }}
        >
          <ArrowLeft style={{ width: "14px", height: "14px" }} />
          Back to Applications
        </Link>
      </div>
    );
  }

  const currentStageConfig =
    STAGES.find((s) => s.key === app.status) ?? STAGES[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Top navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link
            href="/applications"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.35rem 0.75rem",
              borderRadius: "0.4rem",
              backgroundColor: "rgba(255,255,255,0.05)",
              color: "#94a3b8",
              fontSize: "0.8rem",
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <ArrowLeft style={{ width: "12px", height: "12px" }} />
            Pipeline
          </Link>
          <span style={{ color: "#475569", fontSize: "0.85rem" }}>/</span>
          <span style={{ color: "#cbd5e1", fontSize: "0.85rem", fontWeight: "600" }}>
            {app.job?.title ?? "Application Workspace"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {app.jobId && (
            <Link
              href={`/jobs/${app.jobId}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.4rem 0.8rem",
                borderRadius: "0.45rem",
                backgroundColor: "rgba(99,102,241,0.1)",
                color: "#818cf8",
                fontSize: "0.8rem",
                fontWeight: "600",
                textDecoration: "none",
                border: "1px solid rgba(99,102,241,0.25)",
              }}
            >
              <Briefcase style={{ width: "13px", height: "13px" }} />
              View Job Match
            </Link>
          )}
          <button
            type="button"
            onClick={() => void handleDelete()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.4rem 0.8rem",
              borderRadius: "0.45rem",
              backgroundColor: "rgba(239,68,68,0.1)",
              color: "#f87171",
              fontSize: "0.8rem",
              fontWeight: "600",
              border: "1px solid rgba(239,68,68,0.2)",
              cursor: "pointer",
            }}
          >
            <Trash2 style={{ width: "13px", height: "13px" }} />
            Delete
          </button>
        </div>
      </div>

      {/* Main header banner */}
      <div
        style={{
          padding: "1.5rem",
          borderRadius: "0.75rem",
          backgroundColor: "rgba(15,23,42,0.6)",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1.25rem",
        }}
      >
        <div style={{ flex: 1, minWidth: "260px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: "700",
                color: "#f8fafc",
                letterSpacing: "-0.02em",
              }}
            >
              {app.job?.title ?? "Tracked Opportunity"}
            </h1>
            {app.job?.sourceUrl && (
              <a
                href={app.job.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="View original posting"
                style={{ color: "#818cf8" }}
              >
                <ExternalLink style={{ width: "14px", height: "14px" }} />
              </a>
            )}
          </div>
          <p style={{ color: "#94a3b8", fontSize: "0.95rem", marginTop: "0.25rem" }}>
            {app.job?.company ?? "Unknown Company"}
            {app.job?.location ? ` • ${app.job.location}` : ""}
            {app.job?.isRemote ? " (Remote)" : ""}
          </p>
          {app.job?.salaryRange && (
            <p
              style={{
                color: "#10b981",
                fontSize: "0.85rem",
                fontWeight: "600",
                marginTop: "0.25rem",
              }}
            >
              {app.job.salaryRange}
            </p>
          )}

          {app.job?.requiredSkills && app.job.requiredSkills.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.35rem",
                marginTop: "0.75rem",
              }}
            >
              {app.job.requiredSkills.slice(0, 8).map((skill) => (
                <span
                  key={skill}
                  style={{
                    fontSize: "0.7rem",
                    padding: "0.15rem 0.5rem",
                    borderRadius: "0.3rem",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#cbd5e1",
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Current status indicator */}
        <div
          style={{
            padding: "0.85rem 1.25rem",
            borderRadius: "0.6rem",
            backgroundColor: currentStageConfig?.bg ?? "rgba(255,255,255,0.05)",
            border: `1px solid ${currentStageConfig?.border ?? "rgba(255,255,255,0.1)"}`,
            textAlign: "right",
          }}
        >
          <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: "600" }}>
            Current Status
          </div>
          <div
            style={{
              fontSize: "1.2rem",
              fontWeight: "800",
              color: currentStageConfig?.color ?? "#f8fafc",
              marginTop: "0.2rem",
            }}
          >
            {currentStageConfig?.label ?? app.status}
          </div>
        </div>
      </div>

      {/* Stage Transition Stepper */}
      <div
        style={{
          padding: "1.25rem",
          borderRadius: "0.75rem",
          backgroundColor: "rgba(15,23,42,0.4)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "#cbd5e1", marginBottom: "0.75rem" }}>
          Pipeline Stage
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {STAGES.map((s) => {
            const isCurrent = app.status === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => void handleStatusChange(s.key)}
                style={{
                  flex: 1,
                  minWidth: "90px",
                  padding: "0.6rem 0.8rem",
                  borderRadius: "0.5rem",
                  border: isCurrent
                    ? `2px solid ${s.color}`
                    : "1px solid rgba(255,255,255,0.08)",
                  backgroundColor: isCurrent ? s.bg : "rgba(15,23,42,0.5)",
                  color: isCurrent ? s.color : "#94a3b8",
                  cursor: "pointer",
                  textAlign: "center",
                  fontSize: "0.8rem",
                  fontWeight: isCurrent ? "700" : "500",
                  transition: "all 0.15s",
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Details Grid: Left: Notes & Linked Artifacts, Right: Status History */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {/* Left Column: Notes & Metadata */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Notes & Date Card */}
          <div
            style={{
              padding: "1.25rem",
              borderRadius: "0.75rem",
              backgroundColor: "rgba(15,23,42,0.4)",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: "600", color: "#e2e8f0" }}>
                Application Notes & Schedule
              </h3>
              {notesSaved && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    color: "#10b981",
                    fontSize: "0.75rem",
                  }}
                >
                  <CheckCircle2 style={{ width: "13px", height: "13px" }} />
                  Saved
                </span>
              )}
            </div>

            <div>
              <label
                htmlFor="applied-date-input"
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  color: "#94a3b8",
                  marginBottom: "0.35rem",
                  fontWeight: "600",
                }}
              >
                Applied Date
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="applied-date-input"
                  type="date"
                  value={appliedAt}
                  onChange={(e) => setAppliedAt(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.4rem",
                    backgroundColor: "rgba(15,23,42,0.6)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#f1f5f9",
                    fontSize: "0.85rem",
                  }}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="application-notes-input"
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  color: "#94a3b8",
                  marginBottom: "0.35rem",
                  fontWeight: "600",
                }}
              >
                Notes, Contacts & Interview Prep
              </label>
              <textarea
                id="application-notes-input"
                rows={6}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Log recruiter notes, follow-up dates, salary expectations, interview feedback, or questions to ask..."
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "0.4rem",
                  backgroundColor: "rgba(15,23,42,0.6)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#f1f5f9",
                  fontSize: "0.85rem",
                  resize: "vertical",
                  lineHeight: "1.4",
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => void handleSaveNotes()}
              disabled={savingNotes}
              style={{
                alignSelf: "flex-end",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.45rem 1rem",
                borderRadius: "0.45rem",
                background: "linear-gradient(135deg, #6366f1, #a855f7)",
                color: "#fff",
                fontSize: "0.8rem",
                fontWeight: "600",
                border: "none",
                cursor: savingNotes ? "not-allowed" : "pointer",
                opacity: savingNotes ? 0.7 : 1,
              }}
            >
              {savingNotes ? (
                <Loader2 style={{ width: "13px", height: "13px", animation: "spin 1s linear infinite" }} />
              ) : (
                <Save style={{ width: "13px", height: "13px" }} />
              )}
              {savingNotes ? "Saving…" : "Save Details"}
            </button>
          </div>

          {/* Linked Resume Profile Card */}
          <div
            style={{
              padding: "1.25rem",
              borderRadius: "0.75rem",
              backgroundColor: "rgba(15,23,42,0.4)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <h3 style={{ fontSize: "0.95rem", fontWeight: "600", color: "#e2e8f0", marginBottom: "0.6rem" }}>
              Linked Resume Asset
            </h3>
            {app.resumeProfileId ? (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "0.5rem",
                  backgroundColor: "rgba(99,102,241,0.08)",
                  border: "1px solid rgba(99,102,241,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <FileText style={{ width: "16px", height: "16px", color: "#818cf8" }} />
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "#e0e7ff" }}>
                      Resume Profile Linked
                    </div>
                    {app.resumeVersionId && (
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                        Version: {app.resumeVersionId.slice(0, 8)}…
                      </div>
                    )}
                  </div>
                </div>
                <Link
                  href={
                    app.resumeVersionId
                      ? `/resumes/${app.resumeProfileId}/versions/${app.resumeVersionId}`
                      : `/resumes/${app.resumeProfileId}`
                  }
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    color: "#818cf8",
                    textDecoration: "none",
                  }}
                >
                  Open Studio →
                </Link>
              </div>
            ) : (
              <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                No custom resume version was linked to this application. You can tailor one in{" "}
                <Link href="/resumes" style={{ color: "#818cf8", textDecoration: "underline" }}>
                  Resume Studio
                </Link>
                .
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Status History Timeline */}
        <div
          style={{
            padding: "1.25rem",
            borderRadius: "0.75rem",
            backgroundColor: "rgba(15,23,42,0.4)",
            border: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <History style={{ width: "16px", height: "16px", color: "#818cf8" }} />
            <h3 style={{ fontSize: "0.95rem", fontWeight: "600", color: "#e2e8f0" }}>
              Status History Timeline
            </h3>
          </div>

          {historyLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
              <Loader2
                style={{
                  width: "14px",
                  height: "14px",
                  display: "inline-block",
                  animation: "spin 1s linear infinite",
                  marginRight: "0.5rem",
                }}
              />
              Loading audit timeline…
            </div>
          ) : history.length === 0 ? (
            <div style={{ padding: "1.5rem", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
              No status changes recorded yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {history.map((entry, idx) => {
                const stageCfg =
                  STAGES.find((s) => s.key === entry.status) ?? STAGES[0];
                const dateStr = new Date(entry.createdAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <div
                    key={entry.id || idx}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.75rem",
                      padding: "0.6rem 0.8rem",
                      borderRadius: "0.5rem",
                      backgroundColor: "rgba(15,23,42,0.5)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div
                      style={{
                        marginTop: "0.2rem",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: stageCfg?.color ?? "#818cf8",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "0.2rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: "700",
                            color: stageCfg?.color ?? "#cbd5e1",
                            textTransform: "uppercase",
                          }}
                        >
                          {stageCfg?.label ?? entry.status}
                        </span>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            color: "#64748b",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                        >
                          <Clock style={{ width: "11px", height: "11px" }} />
                          {dateStr}
                        </span>
                      </div>
                      {entry.notes && (
                        <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0 }}>
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
