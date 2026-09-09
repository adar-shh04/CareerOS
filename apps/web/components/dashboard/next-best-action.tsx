"use client";

import {
  Award,
  CheckCircle2,
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
  title?: string;
  description?: string;
  completenessPercentage?: number;
  ctaText?: string;
  ctaHref?: string;
  items?: ActionChecklistItem[];
  onActionClick?: () => void;
}

const DEFAULT_CHECKLIST: ActionChecklistItem[] = [
  { id: "personal", label: "Personal details", completed: true },
  { id: "education", label: "Education", completed: true },
  { id: "skills", label: "Skills & experience", completed: true },
  { id: "certifications", label: "Certifications", completed: false },
];

export function NextBestAction({
  title = "Complete your Career Profile",
  description = "Add your certifications to boost your match accuracy with target roles. This will help you get better recommendations and increase your interview chances.",
  completenessPercentage = 88,
  ctaText = "Add certifications",
  ctaHref = "/career?tab=certifications",
  items = DEFAULT_CHECKLIST,
  onActionClick,
}: NextBestActionProps) {
  return (
    <section
      aria-label="Next Best Action"
      className="w-full rounded-xl border border-[#dbeafe] bg-[#f4f8ff] p-5 sm:p-6 shadow-xs transition-shadow hover:shadow-sm"
    >
      {/* Eyebrow / Tag */}
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[#1d68ed]" />
        <span className="text-xs font-bold uppercase tracking-wider text-[#1d68ed]">
          Next Best Action
        </span>
      </div>

      {/* Top Banner: Icon + Content + CTA */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100/90 text-[#1d68ed] shadow-2xs">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
              {title}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 max-w-xl">
              {description}
            </p>
          </div>
        </div>

        <div className="shrink-0 pt-1">
          {onActionClick ? (
            <button
              type="button"
              onClick={onActionClick}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1d68ed] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#1555c8] active:scale-[0.98]"
            >
              <span>{ctaText}</span>
              <span>&rarr;</span>
            </button>
          ) : (
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1d68ed] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#1555c8] active:scale-[0.98]"
            >
              <span>{ctaText}</span>
              <span>&rarr;</span>
            </Link>
          )}
        </div>
      </div>

      {/* Bottom Progress & Checklist Split */}
      <div className="mt-5 grid grid-cols-1 gap-4 pt-4 border-t border-blue-100/80 sm:grid-cols-12 sm:items-center">
        {/* Progress Bar (col-span-6 or 7) */}
        <div className="sm:col-span-6">
          <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1.5">
            <span>Profile completeness</span>
            <span className="font-bold text-slate-900">
              {completenessPercentage}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80">
            <div
              className="h-full rounded-full bg-[#1d68ed] transition-all duration-500"
              style={{
                width: `${String(Math.min(100, Math.max(0, completenessPercentage)))}%`,
              }}
            />
          </div>
        </div>

        {/* Multi-item Checklist (col-span-6) */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:col-span-6 sm:justify-end">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-1.5"
            >
              {item.completed ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-slate-400" />
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
