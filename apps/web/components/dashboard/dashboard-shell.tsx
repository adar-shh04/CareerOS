"use client";

import type { PropsWithChildren } from "react";

interface DashboardShellProps extends PropsWithChildren {
  maxWidth?: number;
}

export function DashboardShell({
  children,
  maxWidth = 1400,
}: DashboardShellProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#080b11",
        color: "#f8fafc",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: `${maxWidth}px`,
          margin: "0 auto",
          padding: "2rem",
        }}
      >
        {children}
      </main>
    </div>
  );
}