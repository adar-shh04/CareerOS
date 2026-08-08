"use client";

import { Briefcase } from "lucide-react";
import React from "react";

interface JobEmptyStateProps {
  query?: string;
  onResetQuery?: () => void;
}

export function JobEmptyState({ query, onResetQuery }: JobEmptyStateProps) {
  return (
    <div className="p-12 text-center rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-md space-y-3">
      <Briefcase className="w-12 h-12 text-indigo-400 mx-auto" />
      <h3 className="text-lg font-bold text-white">No Jobs Found</h3>
      <p className="text-sm text-slate-400 max-w-sm mx-auto">
        {query
          ? `No job opportunities matching "${query}". Try adjusting your filters or search term.`
          : "No active job listings found in the database."}
      </p>
      {query && onResetQuery && (
        <button
          type="button"
          onClick={onResetQuery}
          className="px-4 py-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-semibold text-xs hover:bg-indigo-600/30 transition-colors"
        >
          Clear Search Query
        </button>
      )}
    </div>
  );
}
