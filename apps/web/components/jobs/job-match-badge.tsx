"use client";

import { Sparkles } from "lucide-react";
import React from "react";

interface JobMatchBadgeProps {
  score: number;
}

export function JobMatchBadge({ score }: JobMatchBadgeProps) {
  const getBadgeColors = (s: number) => {
    if (s >= 90) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
    }
    if (s >= 80) {
      return "bg-blue-50 text-[#1d68ed] border-blue-200/80";
    }
    return "bg-amber-50 text-amber-700 border-amber-200/80";
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${getBadgeColors(
        score
      )}`}
    >
      <Sparkles className="w-3.5 h-3.5 shrink-0" />
      <span>{score}% Match</span>
    </div>
  );
}
