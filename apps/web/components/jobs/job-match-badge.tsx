"use client";

import { Sparkles } from "lucide-react";
import React from "react";

interface JobMatchBadgeProps {
  score: number;
}

export function JobMatchBadge({ score }: JobMatchBadgeProps) {
  const getBadgeColors = (s: number) => {
    if (s >= 90) {
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    }
    if (s >= 80) {
      return "bg-indigo-500/15 text-indigo-400 border-indigo-500/30";
    }
    return "bg-amber-500/15 text-amber-400 border-amber-500/30";
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
