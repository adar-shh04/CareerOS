"use client";

import type { PropsWithChildren } from "react";
import React from "react";

import { DashboardHeader } from "./dashboard-header";

interface DashboardShellProps extends PropsWithChildren {
  maxWidth?: number;
  withHeader?: boolean;
}

export function DashboardShell({
  children,
  maxWidth = 1440,
  withHeader = true,
}: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-[#080b11] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {withHeader && <DashboardHeader />}
      <main
        className="flex-1 w-full mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
        style={{ maxWidth: `${String(maxWidth)}px` }}
      >
        {children}
      </main>
    </div>
  );
}