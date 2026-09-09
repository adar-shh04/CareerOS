"use client";

import {
  Check,
  ChevronRight,
  CircleDot,
  FileCheck,
  Milestone,
} from "lucide-react";
import Link from "next/link";
import React from "react";

export type ApplicationStage = "applied" | "interview" | "offer" | "review";

export interface ApplicationActivityItem {
  id: string;
  stage: ApplicationStage;
  stageLabel: string;
  role: string;
  company: string;
  note?: string;
  date: string;
  href?: string;
}

export interface ApplicationActivityProps {
  items?: ApplicationActivityItem[];
  onViewAll?: () => void;
}

const DEFAULT_ACTIVITY: ApplicationActivityItem[] = [
  {
    id: "act-1",
    stage: "applied",
    stageLabel: "Applied",
    role: "Frontend Dev",
    company: "Vandelay",
    note: "(Initech, 1d ago)",
    date: "Mar 12, 2024",
    href: "/applications",
  },
  {
    id: "act-2",
    stage: "applied",
    stageLabel: "Applied",
    role: "Frontend Dev",
    company: "Acme Corp",
    note: "(Initech, 1d ago)",
    date: "Mar 11, 2024",
    href: "/applications",
  },
  {
    id: "act-3",
    stage: "interview",
    stageLabel: "Interview Scheduled",
    role: "Senior SW Engineer",
    company: "Zenith Tech",
    note: "(Vandelay Industries, tomorrow)",
    date: "Mar 16, 2024",
    href: "/applications",
  },
  {
    id: "act-4",
    stage: "offer",
    stageLabel: "Offer Received",
    role: "SDE II",
    company: "Stellar Systems",
    note: "(Example, for layout)",
    date: "Mar 08, 2024",
    href: "/applications",
  },
];

export function ApplicationActivity({
  items = DEFAULT_ACTIVITY,
  onViewAll,
}: ApplicationActivityProps) {
  return (
    <div className="w-full rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-slate-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Application Activity
          </span>
        </div>
        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline"
          >
            View all &rarr;
          </button>
        ) : (
          <Link
            href="/applications"
            className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline"
          >
            View all &rarr;
          </Link>
        )}
      </div>

      {/* Connected Timeline */}
      <div className="relative pl-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <div key={item.id} className="relative flex items-start gap-3.5 pb-4 last:pb-0">
              {/* Connecting vertical line */}
              {!isLast && (
                <span
                  className="absolute left-[9px] top-5 -ml-px h-full w-[2px] bg-slate-100"
                  aria-hidden="true"
                />
              )}

              {/* Status Circle Marker */}
              <div className="relative z-10 flex shrink-0 items-center justify-center pt-0.5">
                {item.stage === "applied" ? (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-2xs">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                ) : item.stage === "interview" ? (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1d68ed] text-white shadow-2xs">
                    <Milestone className="h-3 w-3" />
                  </div>
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-300 text-slate-600 shadow-2xs">
                    <CircleDot className="h-3 w-3" />
                  </div>
                )}
              </div>

              {/* Details & Chevron */}
              <Link
                href={item.href ?? "/applications"}
                className="group flex flex-1 items-start justify-between rounded-lg p-1 transition-colors hover:bg-slate-50/80 -mt-1"
              >
                <div className="min-w-0 pr-2">
                  <div
                    className={`text-xs font-semibold sm:text-sm ${
                      item.stage === "interview"
                        ? "text-[#1d68ed]"
                        : "text-slate-900"
                    }`}
                  >
                    {item.stageLabel}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {item.role} &middot; {item.company}
                  </p>
                  {item.note && (
                    <p className="text-[11px] text-slate-400">{item.note}</p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1.5 pt-0.5 text-slate-400 group-hover:text-slate-600">
                  <span className="text-xs text-slate-500 font-medium">
                    {item.date}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
