"use client";

import {
  Briefcase,
  CheckSquare,
  Milestone,
  User,
} from "lucide-react";
import Link from "next/link";
import React from "react";

export interface CareerSnapshotProps {
  loading?: boolean;
  profileReadiness?: number;
  newJobsCount?: number;
  activeAppsCount?: number;
  interviewsCount?: number;
}

export function CareerSnapshot({
  loading = false,
  profileReadiness = 0,
  newJobsCount = 0,
  activeAppsCount = 0,
  interviewsCount = 0,
}: CareerSnapshotProps) {
  if (loading) {
    return (
      <section aria-label="Career Telemetry" className="w-full">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs animate-pulse space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 bg-slate-200 rounded-md" />
                <div className="h-7 w-7 rounded-lg bg-slate-100" />
              </div>
              <div className="h-6 w-12 bg-slate-200 rounded-md" />
              <div className="h-2 w-full bg-slate-100 rounded-full" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const clampedReadiness = Math.min(100, Math.max(0, Math.round(profileReadiness)));

  return (
    <section aria-label="Career Telemetry" className="w-full">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Profile Readiness */}
        <Link
          href="/career"
          className="group rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all hover:border-blue-200 hover:shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-700">
              Profile Readiness
            </span>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1d68ed] group-hover:bg-blue-100/70 transition-colors">
              <User className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {clampedReadiness}%
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              {clampedReadiness === 100 ? "Complete" : "In progress"}
            </span>
          </div>

          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                clampedReadiness >= 80
                  ? "bg-emerald-600"
                  : clampedReadiness >= 40
                  ? "bg-[#1d68ed]"
                  : "bg-amber-500"
              }`}
              style={{ width: `${String(clampedReadiness)}%` }}
            />
          </div>
        </Link>

        {/* 2. Active Radar Matches */}
        <Link
          href="/jobs"
          className="group rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all hover:border-blue-200 hover:shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-700">
              Radar Matches
            </span>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100/70 transition-colors">
              <Briefcase className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {newJobsCount}
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              {newJobsCount === 1 ? "Active role" : "Active roles"}
            </span>
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
            <span>Market matching</span>
            <span className="text-[#1d68ed] font-medium group-hover:underline">
              Explore &rarr;
            </span>
          </div>
        </Link>

        {/* 3. Active Applications */}
        <Link
          href="/applications"
          className="group rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all hover:border-blue-200 hover:shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-700">
              Applications
            </span>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100/70 transition-colors">
              <CheckSquare className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {activeAppsCount}
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              In pipeline
            </span>
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
            <span>Pipeline CRM</span>
            <span className="text-[#1d68ed] font-medium group-hover:underline">
              View &rarr;
            </span>
          </div>
        </Link>

        {/* 4. Interviews & Screens */}
        <Link
          href="/applications"
          className="group rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all hover:border-blue-200 hover:shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-700">
              Interviews & Screens
            </span>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-100/70 transition-colors">
              <Milestone className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {interviewsCount}
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              Active stages
            </span>
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
            <span>Interview pipeline</span>
            <span className="text-[#1d68ed] font-medium group-hover:underline">
              Stages &rarr;
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}
