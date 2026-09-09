"use client";

import {
  ArrowRight,
  Briefcase,
  Calendar,
  ChevronDown,
  ExternalLink,
  Trash2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
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
  { label: string; textClass: string; bgClass: string; borderClass: string; badgeClass: string }
> = {
  saved: {
    label: "Saved",
    textClass: "text-purple-700",
    bgClass: "bg-purple-50",
    borderClass: "border-purple-200/80",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200/80",
  },
  applied: {
    label: "Applied",
    textClass: "text-[#1d68ed]",
    bgClass: "bg-blue-50",
    borderClass: "border-blue-200/80",
    badgeClass: "bg-blue-50 text-[#1d68ed] border-blue-200/80",
  },
  screening: {
    label: "Screening",
    textClass: "text-amber-700",
    bgClass: "bg-amber-50",
    borderClass: "border-amber-200/80",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200/80",
  },
  interview: {
    label: "Interview",
    textClass: "text-indigo-700",
    bgClass: "bg-indigo-50",
    borderClass: "border-indigo-200/80",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
  },
  offer: {
    label: "Offer",
    textClass: "text-emerald-700",
    bgClass: "bg-emerald-50",
    borderClass: "border-emerald-200/80",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  },
  rejected: {
    label: "Rejected",
    textClass: "text-rose-700",
    bgClass: "bg-rose-50",
    borderClass: "border-rose-200/80",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200/80",
  },
  withdrawn: {
    label: "Withdrawn",
    textClass: "text-slate-600",
    bgClass: "bg-slate-100",
    borderClass: "border-slate-200",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
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
    <div className="flex-1 min-w-[90px] rounded-xl border border-slate-200/80 bg-white p-4 text-center shadow-xs">
      <div className={`text-2xl font-bold tracking-tight leading-none ${cfg.textClass}`}>
        {count}
      </div>
      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-1.5">
        {label}
      </div>
    </div>
  );
}

/* ── Status badge ────────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const cfg = (STATUS_CONFIG as Record<string, { label: string; badgeClass: string }>)[status] ?? {
    label: status,
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${cfg.badgeClass}`}
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
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 cursor-pointer transition-colors shadow-2xs"
      >
        <span>Move to</span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>
      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 z-50 rounded-lg border border-slate-200 bg-white py-1 min-w-[140px] shadow-lg">
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
                className={`block w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer ${cfg.textClass}`}
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

  const title = app.job?.title ?? app.jobTitle ?? `Job ID: ${app.jobId.slice(0, 8)}…`;
  const company = app.job?.company ?? app.company ?? "—";
  const location = app.job?.location ?? null;
  const salary = app.job?.salaryRange ?? null;
  const sourceUrl = app.job?.sourceUrl ?? null;

  return (
    <div className="flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 bg-white shadow-xs hover:border-slate-300 transition-colors">
      {/* Icon */}
      <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-[#1d68ed]">
        <Briefcase className="w-4 h-4" />
      </div>

      {/* Job info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-slate-900 truncate">
            {title}
          </span>
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="View original job posting"
              className="text-[#1d68ed] hover:text-[#1555c8] inline-flex items-center"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
          <span className="font-semibold text-slate-900">{company}</span>
          {location && <span>• {location}</span>}
          {salary && <span className="text-emerald-700 font-medium">• {salary}</span>}
          {appliedDate && (
            <span className="flex items-center gap-1 text-slate-400">
              <Calendar className="w-3 h-3 inline" />
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

      {/* View Workspace */}
      <Link
        href={`/applications/${app.id}`}
        title="Open application workspace"
        className="flex items-center gap-1 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] text-white px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
      >
        <span>Workspace</span>
        <ArrowRight className="w-3 h-3" />
      </Link>

      {/* Delete */}
      <button
        type="button"
        onClick={() => onDelete(app.id)}
        title="Remove application"
        className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────────── */

function EmptyApplications({ onGoToJobs }: { onGoToJobs?: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
      <Briefcase className="w-10 h-10 text-[#1d68ed] mx-auto mb-3" />
      <h3 className="text-base font-bold text-slate-900 mb-1">
        No applications yet
      </h3>
      <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4 leading-relaxed">
        Save or apply to jobs from the Job Radar to begin tracking your pipeline.
      </p>
      {onGoToJobs && (
        <button
          type="button"
          onClick={onGoToJobs}
          className="rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
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
      const res = await fetch("/api/applications", {
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(body.message ?? "Failed to load applications.");
      }
      const data = (await res.json()) as EnrichedApplication[];
      setApps(data);
    } catch (e) {
      if (e instanceof DOMException && e.name === "TimeoutError") {
        setError("Request timed out: backend took too long to respond.");
      } else {
        setError(e instanceof Error ? e.message : "Failed to load applications.");
      }
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
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Application Pipeline
          </h2>
          <span className="text-xs text-slate-500">
            Track every application from discovery to outcome.
          </span>
        </div>
        <button
          type="button"
          onClick={() => void loadApplications()}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
        >
          Refresh
        </button>
      </div>

      {/* Pipeline stats */}
      {!loading && !error && apps.length > 0 && (
        <div className="flex gap-3 flex-wrap">
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
        <div className="flex gap-2 flex-wrap">
          {(["all", ...ORDERED_STATUSES] as const).map((s) => {
            const isActive = filterStatus === s;
            const cfg = s !== "all" ? STATUS_CONFIG[s] : null;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setFilterStatus(s)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer border ${
                  isActive
                    ? (cfg?.badgeClass ?? "bg-blue-50 text-[#1d68ed] border-blue-200/80")
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {s === "all" ? `All (${String(apps.length)})` : STATUS_CONFIG[s].label}
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col gap-2.5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-200/80 bg-white animate-pulse"
            >
              <div className="w-9 h-9 rounded-lg bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-52 bg-slate-200 rounded-md" />
                <div className="h-3 w-36 bg-slate-100 rounded-md" />
              </div>
              <div className="h-6 w-16 bg-slate-100 rounded-full" />
              <div className="h-7 w-20 bg-slate-100 rounded-lg" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadApplications()}
            className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        apps.length === 0 ? (
          <EmptyApplications onGoToJobs={onGoToJobs} />
        ) : (
          <div className="py-12 text-center text-slate-500 text-xs">
            No applications with status &quot;{filterStatus}&quot;.
          </div>
        )
      ) : (
        <div className="flex flex-col gap-2.5">
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
