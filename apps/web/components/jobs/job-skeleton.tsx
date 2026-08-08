"use client";

import React from "react";

export function JobSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="p-5 rounded-xl border border-white/5 bg-slate-900/40 animate-pulse space-y-3"
        >
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="h-5 w-48 bg-slate-800 rounded" />
              <div className="h-4 w-32 bg-slate-800/60 rounded" />
            </div>
            <div className="h-6 w-20 bg-slate-800 rounded-full" />
          </div>
          <div className="h-4 w-full bg-slate-800/40 rounded" />
          <div className="flex gap-2">
            <div className="h-5 w-16 bg-slate-800/50 rounded" />
            <div className="h-5 w-16 bg-slate-800/50 rounded" />
            <div className="h-5 w-16 bg-slate-800/50 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
