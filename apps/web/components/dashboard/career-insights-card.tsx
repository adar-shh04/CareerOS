"use client";

import {
  BarChart3,
  ChevronRight,
  Compass,
  Target,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import React from "react";

export interface InsightTopic {
  id: string;
  icon: "chart" | "trend" | "target";
  title: string;
  description: string;
  href?: string;
}

export interface CareerInsightsCardProps {
  insights?: InsightTopic[];
  onSelectInsight?: (id: string) => void;
}

const DEFAULT_INSIGHTS: InsightTopic[] = [
  {
    id: "skills-appearing",
    icon: "chart",
    title: "Skills frequently appearing",
    description: "Kubernetes, Cloud Security, Terraform, Docker",
    href: "/insights",
  },
  {
    id: "hiring-trends",
    icon: "trend",
    title: "Hiring trends",
    description: "Increased demand for Python in Data Science roles",
    href: "/insights",
  },
  {
    id: "skills-strengthen",
    icon: "target",
    title: "Skills to strengthen",
    description: "Product Management foundations",
    href: "/insights",
  },
];

export function CareerInsightsCard({
  insights = DEFAULT_INSIGHTS,
  onSelectInsight,
}: CareerInsightsCardProps) {
  const renderIcon = (type: InsightTopic["icon"]) => {
    switch (type) {
      case "chart":
        return (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1d68ed]">
            <BarChart3 className="h-4 w-4" />
          </div>
        );
      case "trend":
        return (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <TrendingUp className="h-4 w-4" />
          </div>
        );
      case "target":
        return (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
            <Target className="h-4 w-4" />
          </div>
        );
    }
  };

  return (
    <div className="w-full rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <Compass className="h-4 w-4 text-slate-600" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Career Insights
        </span>
      </div>

      {/* Cards List */}
      <div className="space-y-2.5">
        {insights.map((item) => {
          const content = (
            <div className="flex items-center justify-between rounded-lg p-2.5 transition-colors hover:bg-slate-50/80 group">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                {renderIcon(item.icon)}
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 group-hover:text-[#1d68ed] transition-colors">
                    {item.title}
                  </div>
                  <div className="truncate text-xs text-slate-500 mt-0.5">
                    {item.description}
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-600" />
            </div>
          );

          return onSelectInsight ? (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectInsight(item.id)}
              className="w-full text-left"
            >
              {content}
            </button>
          ) : (
            <Link
              key={item.id}
              href={item.href ?? "/insights"}
              className="block"
            >
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
