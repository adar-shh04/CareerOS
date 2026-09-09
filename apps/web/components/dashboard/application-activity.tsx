"use client";

import {
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  FileCheck,
  Milestone,
  PlusCircle,
} from "lucide-react";
import Link from "next/link";
import React from "react";

import type { TrackedApplication } from "@/lib/api";

export interface ApplicationActivityProps {
  applications?: TrackedApplication[];
  loading?: boolean;
}

export function ApplicationActivity({
  applications = [],
  loading = false,
}: ApplicationActivityProps) {
  const getStageBadge = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
      case "offer":
        return {
          label: "Offer",
          badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
          icon: CheckCircle2,
          iconBg: "bg-emerald-600 text-white",
        };
      case "interview":
        return {
          label: "Interview",
          badgeClass: "bg-blue-50 text-[#1d68ed] border-blue-200/80",
          icon: Milestone,
          iconBg: "bg-[#1d68ed] text-white",
        };
      case "screening":
        return {
          label: "Screening",
          badgeClass: "bg-amber-50 text-amber-700 border-amber-200/80",
          icon: CircleDot,
          iconBg: "bg-amber-500 text-white",
        };
      case "applied":
        return {
          label: "Applied",
          badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
          icon: Check,
          iconBg: "bg-slate-700 text-white",
        };
      default:
        return {
          label: "Saved",
          badgeClass: "bg-slate-50 text-slate-600 border-slate-200",
          icon: CircleDot,
          iconBg: "bg-slate-400 text-white",
        };
    }
  };

  const formatRelativeDate = (isoString?: string | null) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="w-full rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs transition-shadow hover:shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <FileCheck className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Application Pipeline
          </span>
        </div>

        <Link
          href="/applications"
          className="text-xs font-semibold text-[#1d68ed] transition-colors hover:text-[#1555c8] hover:underline"
        >
          View pipeline &rarr;
        </Link>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-4 animate-pulse py-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="h-5 w-5 rounded-full bg-slate-200 shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 w-32 bg-slate-200 rounded-md" />
                <div className="h-3 w-20 bg-slate-100 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : applications.length === 0 ? (
        /* Explicit Intelligent Empty State */
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <FileCheck className="h-5 w-5" />
          </div>
          <div className="space-y-1 max-w-xs">
            <h4 className="text-sm font-bold text-slate-900">
              Start tracking your applications
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Keep track of job submissions, interview stages, notes, and offer statuses in one unified pipeline.
            </p>
          </div>
          <Link
            href="/applications"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1d68ed] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#1555c8] transition-colors"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Track Application</span>
          </Link>
        </div>
      ) : (
        /* Real Activity Timeline */
        <div className="relative pl-1">
          {applications.slice(0, 5).map((app, index) => {
            const isLast = index === Math.min(applications.length, 5) - 1;
            const stageConfig = getStageBadge(app.status);
            const Icon = stageConfig.icon;
            const roleTitle = app.job?.title ?? "Position";
            const companyName = app.job?.company ?? "Company";
            const dateStr = formatRelativeDate(app.appliedAt ?? app.createdAt);

            return (
              <div
                key={app.id}
                className="relative flex items-start gap-3 pb-4 last:pb-0"
              >
                {/* Connecting vertical line */}
                {!isLast && (
                  <span
                    className="absolute left-[9px] top-5 -ml-px h-full w-[2px] bg-slate-100"
                    aria-hidden="true"
                  />
                )}

                {/* Stage Icon Marker */}
                <div className="relative z-10 flex shrink-0 items-center justify-center pt-0.5">
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full shadow-2xs ${stageConfig.iconBg}`}
                  >
                    <Icon className="h-3 w-3 stroke-[2.5]" />
                  </div>
                </div>

                {/* Content */}
                <Link
                  href={`/applications/${app.id}`}
                  className="group flex flex-1 items-center justify-between rounded-xl px-2 py-1 transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-semibold text-slate-900 group-hover:text-[#1d68ed] transition-colors">
                        {roleTitle}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-1.5 py-0.2 text-[9px] font-semibold border ${stageConfig.badgeClass}`}
                      >
                        {stageConfig.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span className="font-medium text-slate-600 truncate max-w-[120px]">
                        {companyName}
                      </span>
                      {dateStr && (
                        <>
                          <span>•</span>
                          <span>{dateStr}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0 ml-2" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
