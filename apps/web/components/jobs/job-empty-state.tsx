"use client";

import { Briefcase } from "lucide-react";
import React from "react";

interface JobEmptyStateProps {
  query?: string;
  onResetQuery?: () => void;
}

export function JobEmptyState({ query, onResetQuery }: JobEmptyStateProps) {
  return (
    <div className="p-12 text-center rounded-xl border border-slate-200/80 bg-white space-y-3 shadow-xs">
      <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
      <h3 className="text-lg font-bold text-slate-900">No Jobs Found</h3>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">
        {query
          ? `No job opportunities matching "${query}". Try adjusting your filters or search term.`
          : "No active job listings found in the database."}
      </p>
      {query && onResetQuery && (
        <button
          type="button"
          onClick={onResetQuery}
          className="px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
        >
          Clear Search Query
        </button>
      )}
    </div>
  );
}
