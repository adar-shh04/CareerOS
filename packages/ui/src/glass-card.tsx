import React from "react";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glow?: "indigo" | "purple" | "emerald" | "cyan" | "none";
  hoverable?: boolean;
}

export function GlassCard({
  children,
  className = "",
  glow = "none",
  hoverable = true,
  ...props
}: GlassCardProps) {
  const glowStyles = {
    none: "",
    indigo: "shadow-[0_0_25px_rgba(99,102,241,0.15)] border-indigo-500/30",
    purple: "shadow-[0_0_25px_rgba(168,85,247,0.15)] border-purple-500/30",
    emerald: "shadow-[0_0_25px_rgba(16,185,129,0.15)] border-emerald-500/30",
    cyan: "shadow-[0_0_25px_rgba(6,182,212,0.15)] border-cyan-500/30",
  };

  const hoverClass = hoverable
    ? "transition-all duration-300 hover:-translate-y-1 hover:border-slate-600/80 hover:shadow-xl"
    : "";

  return (
    <div
      className={`glass-card relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-xl ${glowStyles[glow]} ${hoverClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
