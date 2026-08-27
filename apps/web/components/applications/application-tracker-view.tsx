"use client";

import {
  Briefcase,
  Calendar,
  ChevronDown,
  Loader2,
  Trash2,
  XCircle,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

import type { TrackedApplication } from "@/lib/api";

/* ── Status config ───────────────────────────────────────────────────────── */

type ApplicationStatus =
  | "saved"
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  saved: {
    label: "Saved",
    color: "#818cf8",
    bg: "rgba(99,102,241,0.12)",
    border: "rgba(99,102,241,0.3)",
  },
  applied: {
    label: "Applied",
    color: "#22d3ee",
    bg: "rgba(34,211,238,0.12)",
    border: "rgba(34,211,238,0.3)",
  },
  screening: {
    label: "Screening",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.3)",
  },
  interview: {
    label: "Interview",
    color: "#a855f7",
    bg: "rgba(168,85,247,0.12)",
    border: "rgba(168,85,247,0.3)",
  },
  offer: {
    label: "Offer",
    color: "#10b981",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.3)",
  },
  rejected: {
    label: "Rejected",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.2)",
  },
  withdrawn: {
    label: "Withdrawn",
    color: "#64748b",
    bg: "rgba(100,116,139,0.08)",
    border: "rgba(100,116,139,0.2)",
  },
};

const ORDERED_STATUSES: ApplicationStatus[] = [
  "saved",
  "applied",
  "screening",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
];

/* ── Pipeline stat card ──────────────────────────────────────────────────── */

function PipelineStat({
  label,
  count,
  status,
}: {
  label: string;
  count: number;
  status: ApplicationStatus;
}) {
  const cfg = STATUS_CONFIG[status];
  return (
    <div
      style={{
        flex: 1,
        padding: "1rem",
        borderRadius: "0.75rem",
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.border}`,
        textAlign: "center",
        minWidth: "80px",
      }}
    >
      <div
        style={{
          fontSize: "1.6rem",
          fontWeight: "800",
          color: cfg.color,
          lineHeight: 1.1,
        }}
      >
        {count}
      </div>
      <div
        style={{
          fontSize: "0.7rem",
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontWeight: "600",
          marginTop: "0.3rem",
        }}
      >
        {label}
      </div>
    </div>
  );
}

/* ── Status badge ────────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const cfg = (STATUS_CONFIG as Record<string, { label: string; color: string; bg: string; border: string }>)[status] ?? {
    label: status,
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.1)",
    border: "rgba(148,163,184,0.2)",
  };
  return (
    <span
      style={{
        padding: "0.2rem 0.6rem",
        borderRadius: "999px",
        fontSize: "0.7rem",
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: cfg.color,
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </span>
  );
}

/* ── Status change dropdown ──────────────────────────────────────────────── */

function StatusSelect({
  current,
  onSelect,
}: {
  current: string;
  onSelect: (s: ApplicationStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.3rem",
          padding: "0.25rem 0.6rem",
          borderRadius: "0.4rem",
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(15,23,42,0.6)",
          color: "#94a3b8",
          fontSize: "0.75rem",
          cursor: "pointer",
        }}
      >
        Move to <ChevronDown style={{ width: "12px", height: "12px" }} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 50,
            backgroundColor: "#0f172a",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "0.6rem",
            overflow: "hidden",
            minWidth: "140px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          {ORDERED_STATUSES.filter((s) => s !== current).map((s) => {
            const cfg = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  onSelect(s);
                  setOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "0.5rem 0.8rem",
                  fontSize: "0.8rem",
                  color: cfg.color,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Application row ─────────────────────────────────────────────────────── */

interface EnrichedApplication extends TrackedApplication {
  jobTitle?: string;
  company?: string;
}

function ApplicationRow({
  app,
  onStatusChange,
  onDelete,
}: {
  app: EnrichedApplication;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onDelete: (id: string) => void;
}) {
  const appliedDate = app.appliedAt
    ? new Date(app.appliedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        padding: "0.9rem 1rem",
        borderRadius: "0.6rem",
        backgroundColor: "rgba(15,23,42,0.5)",
        border: "1px solid rgba(255,255,255,0.06)",
        transition: "border-color 0.15s",
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "0.5rem",
          background: "rgba(99,102,241,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Briefcase style={{ width: "16px", height: "16px", color: "#818cf8" }} />
      </div>

      {/* Job info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "0.9rem",
            fontWeight: "600",
            color: "#f1f5f9",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {app.jobTitle ?? `Job ID: ${app.jobId.slice(0, 8)}…`}
        </div>
        <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.1rem" }}>
          {app.company ?? "—"}
          {appliedDate && (
            <span style={{ marginLeft: "0.75rem", color: "#475569" }}>
              <Calendar
                style={{
                  width: "10px",
                  height: "10px",
                  display: "inline",
                  marginRight: "0.25rem",
                  verticalAlign: "middle",
                }}
              />
              {appliedDate}
            </span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <StatusBadge status={app.status} />

      {/* Move to */}
      <StatusSelect
        current={app.status}
        onSelect={(s) => onStatusChange(app.id, s)}
      />

      {/* Delete */}
      <button
        type="button"
        onClick={() => onDelete(app.id)}
        title="Remove application"
        style={{
          background: "none",
          border: "none",
          color: "#475569",
          cursor: "pointer",
          padding: "0.25rem",
          borderRadius: "0.3rem",
          display: "flex",
          alignItems: "center",
        }}
      >
        <Trash2 style={{ width: "14px", height: "14px" }} />
      </button>
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────────── */

function EmptyApplications({ onGoToJobs }: { onGoToJobs?: () => void }) {
  return (
    <div
      style={{
        padding: "3rem 1.5rem",
        textAlign: "center",
        borderRadius: "0.75rem",
        backgroundColor: "rgba(15,23,42,0.4)",
        border: "1px dashed rgba(255,255,255,0.1)",
      }}
    >
      <Briefcase
        style={{
          width: "40px",
          height: "40px",
          color: "#334155",
          margin: "0 auto 1rem",
        }}
      />
      <h3
        style={{
          fontSize: "1rem",
          fontWeight: "700",
          color: "#cbd5e1",
          marginBottom: "0.5rem",
        }}
      >
        No applications yet
      </h3>
      <p
        style={{
          fontSize: "0.85rem",
          color: "#64748b",
          maxWidth: "340px",
          margin: "0 auto 1.25rem",
          lineHeight: 1.5,
        }}
      >
        Save or apply to jobs from the Job Radar to begin tracking your pipeline.
      </p>
      {onGoToJobs && (
        <button
          type="button"
          onClick={onGoToJobs}
          style={{
            padding: "0.5rem 1.1rem",
            borderRadius: "0.5rem",
            background: "linear-gradient(135deg, #6366f1, #a855f7)",
            color: "#fff",
            fontWeight: "600",
            fontSize: "0.85rem",
            border: "none",
            cursor: "pointer",
          }}
        >
          Browse Job Radar
        </button>
      )}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */

interface ApplicationTrackerViewProps {
  onGoToJobs?: () => void;
}

export function ApplicationTrackerView({ onGoToJobs }: ApplicationTrackerViewProps) {
  const [apps, setApps] = useState<EnrichedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ApplicationStatus | "all">("all");

  /* ── Load applications ──────────────────────────────────────────────── */

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/applications", { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(body.message ?? "Failed to load applications.");
      }
      const data = (await res.json()) as EnrichedApplication[];
      setApps(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  /* ── Status change ──────────────────────────────────────────────────── */

  const handleStatusChange = useCallback(
    async (applicationId: string, status: ApplicationStatus) => {
      // Optimistic update
      setApps((prev) =>
        prev.map((a) => (a.id === applicationId ? { ...a, status } : a)),
      );
      try {
        const res = await fetch(`/api/applications/${applicationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) {
          // Rollback on failure
          await loadApplications();
        }
      } catch {
        await loadApplications();
      }
    },
    [loadApplications],
  );

  /* ── Delete ─────────────────────────────────────────────────────────── */

  const handleDelete = useCallback(
    async (applicationId: string) => {
      setApps((prev) => prev.filter((a) => a.id !== applicationId));
      try {
        await fetch(`/api/applications/${applicationId}`, { method: "DELETE" });
      } catch {
        await loadApplications();
      }
    },
    [loadApplications],
  );

  /* ── Derived data ───────────────────────────────────────────────────── */

  const stats = {
    total: apps.length,
    saved: apps.filter((a) => a.status === "saved").length,
    applied: apps.filter((a) => a.status === "applied").length,
    screening: apps.filter((a) => a.status === "screening").length,
    interview: apps.filter((a) => a.status === "interview").length,
    offer: apps.filter((a) => a.status === "offer").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
    withdrawn: apps.filter((a) => a.status === "withdrawn").length,
  };

  const filtered =
    filterStatus === "all" ? apps : apps.filter((a) => a.status === filterStatus);

  /* ── Render ─────────────────────────────────────────────────────────── */

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "1.35rem",
              fontWeight: "700",
              letterSpacing: "-0.02em",
            }}
          >
            Application Pipeline
          </h2>
          <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
            Track every application from discovery to outcome.
          </span>
        </div>
        <button
          type="button"
          onClick={() => void loadApplications()}
          style={{
            padding: "0.45rem 0.9rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(15,23,42,0.6)",
            color: "#94a3b8",
            fontSize: "0.8rem",
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      {/* Pipeline stats */}
      {!loading && !error && apps.length > 0 && (
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <PipelineStat label="Saved" count={stats.saved} status="saved" />
          <PipelineStat label="Applied" count={stats.applied} status="applied" />
          <PipelineStat label="Screening" count={stats.screening} status="screening" />
          <PipelineStat label="Interview" count={stats.interview} status="interview" />
          <PipelineStat label="Offer" count={stats.offer} status="offer" />
          <PipelineStat label="Rejected" count={stats.rejected} status="rejected" />
        </div>
      )}

      {/* Filter bar */}
      {!loading && apps.length > 0 && (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {(["all", ...ORDERED_STATUSES] as const).map((s) => {
            const isActive = filterStatus === s;
            const cfg = s !== "all" ? STATUS_CONFIG[s] : null;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setFilterStatus(s)}
                style={{
                  padding: "0.3rem 0.75rem",
                  borderRadius: "999px",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  border: isActive
                    ? `1px solid ${cfg?.border ?? "rgba(99,102,241,0.4)"}`
                    : "1px solid rgba(255,255,255,0.08)",
                  background: isActive
                    ? (cfg?.bg ?? "rgba(99,102,241,0.12)")
                    : "transparent",
                  color: isActive ? (cfg?.color ?? "#818cf8") : "#64748b",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {s === "all" ? `All (${String(apps.length)})` : STATUS_CONFIG[s].label}
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          <Loader2
            style={{
              width: "16px",
              height: "16px",
              animation: "spin 1s linear infinite",
            }}
          />
          Loading applications…
        </div>
      ) : error ? (
        <div
          style={{
            padding: "1.5rem",
            borderRadius: "0.75rem",
            backgroundColor: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#ef4444",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <XCircle style={{ width: "16px", height: "16px", flexShrink: 0 }} />
          {error}
        </div>
      ) : filtered.length === 0 ? (
        apps.length === 0 ? (
          <EmptyApplications onGoToJobs={onGoToJobs} />
        ) : (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "#64748b",
              fontSize: "0.9rem",
            }}
          >
            No applications with status &quot;{filterStatus}&quot;.
          </div>
        )
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          {filtered.map((app) => (
            <ApplicationRow
              key={app.id}
              app={app}
              onStatusChange={(id, status) => {
                void handleStatusChange(id, status);
              }}
              onDelete={(id) => {
                void handleDelete(id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
