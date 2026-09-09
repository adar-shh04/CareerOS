"use client";

import {
  Briefcase,
  Calendar,
  Compass,
  FileText,
  TrendingUp,
  User,
} from "lucide-react";
import Link from "next/link";
import React from "react";

export interface CareerSnapshotProps {
  profileReadiness?: number;
  newJobsCount?: number;
  newJobsDelta?: string;
  activeAppsCount?: number;
  activeAppsDelta?: string;
  interviewsCount?: number;
  nextInterviewDate?: string;
  onViewDetails?: () => void;
}

export function CareerSnapshot({
  profileReadiness = 88,
  newJobsCount = 3,
  newJobsDelta = "+3 since last 24h",
  activeAppsCount = 2,
  activeAppsDelta = "+1 since last 7 days",
  interviewsCount = 1,
  nextInterviewDate = "Next: Mar 16, 2024",
  onViewDetails,
}: CareerSnapshotProps) {
  return (
    <section aria-label="Career Snapshot" className="w-full">
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
        {/* Section Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-slate-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Career Snapshot
            </span>
          </div>
          {onViewDetails ? (
            <button
              type="button"
              onClick={onViewDetails}
              className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline"
            >
              View details &rarr;
            </button>
          ) : (
            <Link
              href="/career"
              className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline"
            >
              View details &rarr;
            </Link>
          )}
        </div>

        {/* Metrics Grid with Hairline Dividers */}
        <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-y-0 sm:gap-4 lg:grid-cols-4 lg:divide-x lg:divide-y-0 lg:gap-0">
          {/* 1. Profile Readiness */}
          <div className="flex items-center gap-3.5 py-3 sm:py-2 lg:px-4 lg:py-1 lg:first:pl-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-medium text-slate-500">
                Profile Readiness
              </span>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900">
                  {profileReadiness}%
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#1d68ed] transition-all duration-500"
                  style={{ width: `${String(Math.min(100, Math.max(0, profileReadiness)))}%` }}
                />
              </div>
            </div>
          </div>

          {/* 2. New Matching Jobs */}
          <div className="flex items-center gap-3.5 py-3 sm:py-2 lg:px-4 lg:py-1">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Briefcase className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-medium text-slate-500">
                New Matching Jobs
              </span>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900">
                  {newJobsCount}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                <TrendingUp className="h-3 w-3" />
                <span>{newJobsDelta}</span>
              </div>
            </div>
          </div>

          {/* 3. Active Applications */}
          <div className="flex items-center gap-3.5 py-3 sm:py-2 lg:px-4 lg:py-1">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-medium text-slate-500">
                Active Applications
              </span>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900">
                  {activeAppsCount}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                <TrendingUp className="h-3 w-3" />
                <span>{activeAppsDelta}</span>
              </div>
            </div>
          </div>

          {/* 4. Interviews Scheduled */}
          <div className="flex items-center gap-3.5 py-3 sm:py-2 lg:px-4 lg:py-1 lg:last:pr-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-medium text-slate-500">
                Interviews Scheduled
              </span>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900">
                  {interviewsCount}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-slate-500">
                <Calendar className="h-3 w-3 text-slate-400" />
                <span>{nextInterviewDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
