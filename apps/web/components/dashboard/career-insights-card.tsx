"use client";

import {
  BookOpen,
  ChevronRight,
  Compass,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import React from "react";

export interface MarketSkillDemand {
  name: string;
  count: number;
}

export interface HandbookHighlight {
  title: string;
  category: string;
  href: string;
}

export interface CareerInsightsCardProps {
  loading?: boolean;
  marketSkills?: MarketSkillDemand[];
  handbookHighlights?: HandbookHighlight[];
}

export function CareerInsightsCard({
  loading = false,
  marketSkills = [],
  handbookHighlights = [],
}: CareerInsightsCardProps) {
  const hasData = marketSkills.length > 0 || handbookHighlights.length > 0;

  return (
    <div className="w-full rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs transition-shadow hover:shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <TrendingUp className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Career Intelligence
          </span>
        </div>

        <Link
          href="/insights"
          className="text-xs font-semibold text-[#1d68ed] transition-colors hover:text-[#1555c8] hover:underline"
        >
          Explore insights &rarr;
        </Link>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-4 animate-pulse py-2">
          <div className="h-4 w-32 bg-slate-200 rounded-md" />
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-6 w-20 bg-slate-100 rounded-full" />
            ))}
          </div>
          <div className="h-4 w-40 bg-slate-200 rounded-md pt-2" />
          <div className="h-10 w-full bg-slate-50 rounded-xl" />
        </div>
      ) : !hasData ? (
        /* Explicit Intelligent Empty State */
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Compass className="h-5 w-5" />
          </div>
          <div className="space-y-1 max-w-xs">
            <h4 className="text-sm font-bold text-slate-900">
              Insights unlock as CareerOS learns
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Personalized market demand and curated career handbook guidance populate once target roles and skills are established.
            </p>
          </div>
          <Link
            href="/career"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1d68ed] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#1555c8] transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Complete Profile</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Section 1: Live Market Demand (Aggregated from active jobs) */}
          {marketSkills.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Live Market Demand (Active Jobs)
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {marketSkills.slice(0, 6).map((skill) => (
                  <span
                    key={skill.name}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50/80 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-slate-300 transition-colors"
                  >
                    <span>{skill.name}</span>
                    <span className="rounded-full bg-blue-100 text-[#1d68ed] px-1 text-[10px] font-bold">
                      {skill.count}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Career Handbook Guidance (Clearly separated from market demand) */}
          {handbookHighlights.length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5 mb-2">
                <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Curated Handbook Guidance
                </span>
              </div>
              <div className="space-y-2">
                {handbookHighlights.slice(0, 3).map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="group flex items-center justify-between rounded-xl p-2 bg-slate-50/60 hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-800 group-hover:text-[#1d68ed] transition-colors truncate">
                        {item.title}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.category}
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0 ml-2" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
