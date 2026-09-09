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

const STAGES: {
  key: ApplicationStatus;
  label: string;
  color: string;
  bg: string;
  border: string;
  activeClass: string;
}[] = [
  {
    key: "saved",
    label: "Saved",
    color: "#7e22ce",
    bg: "#faf5ff",
    border: "#e9d5ff",
    activeClass: "border-purple-300 bg-purple-50 text-purple-700",
  },
  {
    key: "applied",
    label: "Applied",
    color: "#1d68ed",
    bg: "#f0f7ff",
    border: "#bfdbfe",
    activeClass: "border-blue-300 bg-blue-50 text-[#1d68ed]",
  },
  {
    key: "screening",
    label: "Screening",
    color: "#b45309",
    bg: "#fffbeb",
    border: "#fde68a",
    activeClass: "border-amber-300 bg-amber-50 text-amber-700",
  },
  {
    key: "interview",
    label: "Interview",
    color: "#4338ca",
    bg: "#eef2ff",
    border: "#c7d2fe",
    activeClass: "border-indigo-300 bg-indigo-50 text-indigo-700",
  },
  {
    key: "offer",
    label: "Offer",
    color: "#047857",
    bg: "#ecfdf5",
    border: "#a7f3d0",
    activeClass: "border-emerald-300 bg-emerald-50 text-emerald-700",
  },
  {
    key: "rejected",
    label: "Rejected",
    color: "#b91c1c",
    bg: "#fef2f2",
    border: "#fecaca",
    activeClass: "border-rose-300 bg-rose-50 text-rose-700",
  },
  {
    key: "withdrawn",
    label: "Withdrawn",
    color: "#475569",
    bg: "#f8fafc",
    border: "#e2e8f0",
    activeClass: "border-slate-300 bg-slate-100 text-slate-700",
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
      <div className="py-24 text-center text-slate-400 flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#1d68ed]" />
        <span className="text-xs font-medium">Loading application workspace…</span>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="max-w-xl mx-auto my-8 p-6">
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-3 mb-4 text-xs">
          <XCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span className="font-medium">{error ?? "Application not found"}</span>
        </div>
        <Link
          href="/applications"
          className="inline-flex items-center gap-1.5 text-xs text-[#1d68ed] hover:text-[#1555c8] font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Applications
        </Link>
      </div>
    );
  }

  const currentStageConfig =
    STAGES.find((s) => s.key === app.status) ?? STAGES[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Top navigation */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/applications"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-medium shadow-2xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Pipeline
          </Link>
          <span className="text-slate-300 text-sm">/</span>
          <span className="text-slate-900 text-sm font-semibold">
            {app.job?.title ?? "Application Workspace"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {app.jobId && (
            <Link
              href={`/jobs/${app.jobId}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-[#1d68ed] hover:bg-blue-100/70 border border-blue-200/80 text-xs font-semibold transition-colors"
            >
              <Briefcase className="w-3.5 h-3.5" />
              View Job Match
            </Link>
          )}
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-semibold cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>

      {/* Main header banner */}
      <div className="p-6 rounded-xl bg-white border border-slate-200/80 shadow-xs flex justify-between items-start flex-wrap gap-5">
        <div className="flex-1 min-w-[260px]">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {app.job?.title ?? "Tracked Opportunity"}
            </h1>
            {app.job?.sourceUrl && (
              <a
                href={app.job.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="View original posting"
                className="text-[#1d68ed] hover:text-[#1555c8] transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
          <p className="text-slate-500 text-xs mt-1">
            {app.job?.company ?? "Unknown Company"}
            {app.job?.location ? ` • ${app.job.location}` : ""}
            {app.job?.isRemote ? " (Remote)" : ""}
          </p>
          {app.job?.salaryRange && (
            <p className="text-emerald-700 text-xs font-semibold mt-1">
              {app.job.salaryRange}
            </p>
          )}

          {app.job?.requiredSkills && app.job.requiredSkills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {app.job.requiredSkills.slice(0, 8).map((skill) => (
                <span
                  key={skill}
                  className="text-xs px-2.5 py-0.5 rounded-md bg-slate-50 border border-slate-200/70 text-slate-700 font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Current status indicator */}
        <div
          className="p-3.5 px-5 rounded-xl text-right border shadow-2xs"
          style={{
            backgroundColor: currentStageConfig?.bg ?? "#f8fafc",
            borderColor: currentStageConfig?.border ?? "#e2e8f0",
          }}
        >
          <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">
            Current Status
          </div>
          <div
            className="text-lg font-extrabold mt-0.5"
            style={{ color: currentStageConfig?.color ?? "#0f172a" }}
          >
            {currentStageConfig?.label ?? app.status}
          </div>
        </div>
      </div>

      {/* Stage Transition Stepper */}
      <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
          Pipeline Stage
        </div>
        <div className="flex gap-2 flex-wrap">
          {STAGES.map((s) => {
            const isCurrent = app.status === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => void handleStatusChange(s.key)}
                className={`flex-1 min-w-[90px] py-2 px-3 rounded-lg border text-center text-xs transition-all cursor-pointer ${
                  isCurrent
                    ? `${s.activeClass} font-bold shadow-xs`
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Details Grid: Left: Notes & Linked Artifacts, Right: Status History */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Notes & Metadata */}
        <div className="flex flex-col gap-5">
          {/* Notes & Date Card */}
          <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-900">
                Application Notes & Schedule
              </h3>
              {notesSaved && (
                <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Saved
                </span>
              )}
            </div>

            <div>
              <label
                htmlFor="applied-date-input"
                className="block text-xs text-slate-700 mb-1.5 font-medium"
              >
                Applied Date
              </label>
              <input
                id="applied-date-input"
                type="date"
                value={appliedAt}
                onChange={(e) => setAppliedAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-[#1d68ed] focus:bg-white focus:ring-2 focus:ring-[#1d68ed]/20 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="application-notes-input"
                className="block text-xs text-slate-700 mb-1.5 font-medium"
              >
                Notes, Contacts & Interview Prep
              </label>
              <textarea
                id="application-notes-input"
                rows={6}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Log recruiter notes, follow-up dates, salary expectations, interview feedback, or questions to ask..."
                className="w-full p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs resize-y leading-relaxed focus:border-[#1d68ed] focus:bg-white focus:ring-2 focus:ring-[#1d68ed]/20 focus:outline-none placeholder:text-slate-400"
              />
            </div>

            <button
              type="button"
              onClick={() => void handleSaveNotes()}
              disabled={savingNotes}
              className="self-end inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {savingNotes ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {savingNotes ? "Saving…" : "Save Details"}
            </button>
          </div>

          {/* Linked Resume Profile Card */}
          <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900 mb-2.5">
              Linked Resume Asset
            </h3>
            {app.resumeProfileId ? (
              <div className="p-3.5 px-4 rounded-lg bg-[#f4f8ff] border border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-[#1d68ed]" />
                  <div>
                    <div className="text-xs font-semibold text-slate-900">
                      Resume Profile Linked
                    </div>
                    {app.resumeVersionId && (
                      <div className="text-[11px] text-slate-500">
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
                  className="text-xs font-semibold text-[#1d68ed] hover:text-[#1555c8] transition-colors"
                >
                  Open Studio →
                </Link>
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                No custom resume version was linked to this application. You can tailor one in{" "}
                <Link href="/resumes" className="text-[#1d68ed] hover:underline font-medium">
                  Resume Studio
                </Link>
                .
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Status History Timeline */}
        <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#1d68ed]" />
            <h3 className="text-sm font-semibold text-slate-900">
              Status History Timeline
            </h3>
          </div>

          {historyLoading ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <Loader2 className="w-3.5 h-3.5 inline-block animate-spin mr-2 text-[#1d68ed]" />
              Loading audit timeline…
            </div>
          ) : history.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              No status changes recorded yet.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
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
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-50/80 border border-slate-200/70"
                  >
                    <div
                      className="mt-1 w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: stageCfg?.color ?? "#1d68ed" }}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span
                          className="text-xs font-bold uppercase tracking-wider"
                          style={{ color: stageCfg?.color ?? "#0f172a" }}
                        >
                          {stageCfg?.label ?? entry.status}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {dateStr}
                        </span>
                      </div>
                      {entry.notes && (
                        <p className="text-xs text-slate-600 m-0">
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
