"use client";

import React from "react";

export function JobSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="p-5 rounded-xl border border-slate-200/80 bg-white animate-pulse space-y-3 shadow-xs"
        >
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="h-5 w-48 bg-slate-200 rounded" />
              <div className="h-4 w-32 bg-slate-100 rounded" />
            </div>
            <div className="h-6 w-20 bg-slate-100 rounded-full" />
          </div>
          <div className="h-4 w-full bg-slate-100 rounded" />
          <div className="flex gap-2">
            <div className="h-5 w-16 bg-slate-100 rounded" />
            <div className="h-5 w-16 bg-slate-100 rounded" />
            <div className="h-5 w-16 bg-slate-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
