"use client";

import {
  MapPin,
  Radar,
} from "lucide-react";
import Link from "next/link";
import React from "react";

export interface JobMatchItem {
  id: string;
  role: string;
  company: string;
  avatarChar: string;
  location: string;
  type: "Full-Time" | "Remote" | "Hybrid" | "Part-Time";
  matchPercentage: number;
  posted: string;
  href?: string;
}

export interface JobRadarPreviewProps {
  jobs?: JobMatchItem[];
  onViewAll?: () => void;
}

const DEFAULT_JOBS: JobMatchItem[] = [
  {
    id: "job-1",
    role: "Senior Data Analyst",
    company: "Hooli",
    avatarChar: "H",
    location: "Seattle, WA",
    type: "Full-Time",
    matchPercentage: 92,
    posted: "2d ago",
    href: "/jobs",
  },
  {
    id: "job-2",
    role: "Frontend Engineer",
    company: "Initech",
    avatarChar: "I",
    location: "Remote",
    type: "Remote",
    matchPercentage: 85,
    posted: "4d ago",
    href: "/jobs",
  },
  {
    id: "job-3",
    role: "ML Engineer",
    company: "Omni Consumer Products",
    avatarChar: "O",
    location: "Detroit, MI",
    type: "Full-Time",
    matchPercentage: 89,
    posted: "1d ago",
    href: "/jobs",
  },
  {
    id: "job-4",
    role: "Backend Developer",
    company: "Vandelay Industries",
    avatarChar: "V",
    location: "New York, NY",
    type: "Hybrid",
    matchPercentage: 82,
    posted: "3d ago",
    href: "/jobs",
  },
];

export function JobRadarPreview({
  jobs = DEFAULT_JOBS,
  onViewAll,
}: JobRadarPreviewProps) {
  const getTypeBadgeClass = (type: JobMatchItem["type"]) => {
    switch (type) {
      case "Remote":
        return "bg-purple-50 text-purple-600 border border-purple-100/70";
      case "Hybrid":
        return "bg-indigo-50 text-indigo-600 border border-indigo-100/70";
      default:
        return "bg-blue-50 text-blue-600 border border-blue-100/70";
    }
  };

  return (
    <div className="w-full rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radar className="h-4 w-4 text-slate-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Job Radar Preview
          </span>
        </div>
        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline"
          >
            View Job Radar &rarr;
          </button>
        ) : (
          <Link
            href="/jobs"
            className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline"
          >
            View Job Radar &rarr;
          </Link>
        )}
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <th scope="col" className="pb-2.5 font-semibold">Role</th>
              <th scope="col" className="pb-2.5 font-semibold">Location</th>
              <th scope="col" className="pb-2.5 font-semibold">Type</th>
              <th scope="col" className="pb-2.5 font-semibold">Match</th>
              <th scope="col" className="pb-2.5 font-semibold text-right">Posted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {jobs.map((job) => (
              <tr
                key={job.id}
                className="group transition-colors hover:bg-slate-50/70"
              >
                {/* Role & Company */}
                <td className="py-3">
                  <Link
                    href={job.href ?? "/jobs"}
                    className="flex items-center gap-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0d131f] font-bold text-white shadow-2xs">
                      {job.avatarChar}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 group-hover:text-[#1d68ed] transition-colors">
                        {job.role}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {job.company}
                      </div>
                    </div>
                  </Link>
                </td>

                {/* Location */}
                <td className="py-3 text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    <span>{job.location}</span>
                  </span>
                </td>

                {/* Type Badge */}
                <td className="py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${getTypeBadgeClass(
                      job.type
                    )}`}
                  >
                    {job.type}
                  </span>
                </td>

                {/* Match Score Badge */}
                <td className="py-3">
                  <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
                    {job.matchPercentage}%
                  </span>
                </td>

                {/* Posted Date */}
                <td className="py-3 text-right text-slate-400">
                  {job.posted}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
