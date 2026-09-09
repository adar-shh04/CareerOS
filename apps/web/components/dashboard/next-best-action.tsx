"use client";

import {
  Award,
  CheckCircle2,
  ChevronRight,
  Circle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import React from "react";

export interface ActionChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

export interface NextBestActionProps {
  loading?: boolean;
  title?: string;
  description?: string;
  completenessPercentage?: number;
  ctaText?: string;
  ctaHref?: string;
  items?: ActionChecklistItem[];
  onActionClick?: () => void;
}

export function NextBestAction({
  loading = false,
  title = "Complete your Career Profile",
  description = "Add your verified skills, experience, and certifications to ground deterministic job matching and resume tailoring.",
  completenessPercentage = 0,
  ctaText = "Update Profile",
  ctaHref = "/career",
  items = [
    { id: "personal", label: "Personal details", completed: false },
    { id: "education", label: "Education", completed: false },
    { id: "skills", label: "Skills & experience", completed: false },
    { id: "certifications", label: "Certifications", completed: false },
  ],
  onActionClick,
}: NextBestActionProps) {
  if (loading) {
    return (
      <section
        aria-label="Career Readiness & Action"
        className="w-full rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs animate-pulse space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="h-4 w-28 bg-slate-200 rounded-md" />
          <div className="h-8 w-24 bg-slate-200 rounded-lg" />
        </div>
        <div className="space-y-2">
          <div className="h-5 w-64 bg-slate-200 rounded-md" />
          <div className="h-3.5 w-full max-w-lg bg-slate-100 rounded-md" />
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full" />
      </section>
    );
  }

  const clampedPercent = Math.min(100, Math.max(0, Math.round(completenessPercentage)));

  return (
    <section
      aria-label="Career Readiness & Action"
      className="w-full rounded-2xl border border-blue-100/90 bg-gradient-to-br from-blue-50/70 via-white to-slate-50/50 p-5 sm:p-6 shadow-xs transition-shadow hover:shadow-sm"
    >
      {/* Top Banner: Eyebrow + CTA */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-[#1d68ed]">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#1d68ed]">
            Next Best Action
          </span>
        </div>

        <div className="shrink-0">
          {onActionClick ? (
            <button
              type="button"
              onClick={onActionClick}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1d68ed] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#1555c8] active:scale-[0.98] cursor-pointer"
            >
              <span>{ctaText}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1d68ed] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#1555c8] active:scale-[0.98]"
            >
              <span>{ctaText}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Main Title & Actionable Description */}
      <div className="mt-3 flex items-start gap-3.5">
        <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-blue-100 text-[#1d68ed] shadow-2xs">
          <Award className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight sm:text-lg">
            {title}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 max-w-xl">
            {description}
          </p>
        </div>
      </div>

      {/* Bottom Progress & Checklist Split */}
      <div className="mt-5 grid grid-cols-1 gap-4 pt-4 border-t border-blue-100/70 sm:grid-cols-12 sm:items-center">
        {/* Progress Bar (col-span-5) */}
        <div className="sm:col-span-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1.5">
            <span>Profile Completeness</span>
            <span className="font-bold text-slate-900">
              {clampedPercent}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80">
            <div
              className="h-full rounded-full bg-[#1d68ed] transition-all duration-500"
              style={{ width: `${String(clampedPercent)}%` }}
            />
          </div>
        </div>

        {/* Multi-item Checklist (col-span-7) */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:col-span-7 sm:justify-end">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-1.5">
              {item.completed ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-slate-300" />
              )}
              <span
                className={
                  item.completed
                    ? "font-medium text-slate-700"
                    : "text-slate-500"
                }
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
