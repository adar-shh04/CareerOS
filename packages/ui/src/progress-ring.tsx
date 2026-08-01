import React from "react";

export interface ProgressRingProps {
  score: number; // 0 - 100
  size?: number; // width/height in px
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  colorScheme?: "emerald" | "indigo" | "amber" | "cyan";
}

export function ProgressRing({
  score,
  size = 120,
  strokeWidth = 10,
  label = "Score",
  sublabel,
  colorScheme = "emerald",
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const colorGradients = {
    emerald: { stroke: "#10b981", text: "text-emerald-400" },
    indigo: { stroke: "#6366f1", text: "text-indigo-400" },
    amber: { stroke: "#f59e0b", text: "text-amber-400" },
    cyan: { stroke: "#06b6d4", text: "text-cyan-400" },
  };

  const activeColor = colorGradients[colorScheme];

  return (
    <div className="relative inline-flex flex-col items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={activeColor.stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          className={`text-2xl font-bold tracking-tight ${activeColor.text}`}
        >
          {score}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
          {label}
        </span>
      </div>
      {sublabel && (
        <span className="mt-2 text-xs font-medium text-slate-400">
          {sublabel}
        </span>
      )}
    </div>
  );
}
