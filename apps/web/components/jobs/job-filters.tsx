"use client";

import { Bookmark, EyeOff, Filter, Globe } from "lucide-react";
import React from "react";

interface JobFiltersProps {
  remoteOnly: boolean;
  onToggleRemoteOnly: (val: boolean) => void;
  savedOnly?: boolean;
  onToggleSavedOnly?: (val: boolean) => void;
  showDismissed?: boolean;
  onToggleShowDismissed?: (val: boolean) => void;
  selectedSkill: string;
  onSelectSkill: (skill: string) => void;
  availableSkills: string[];
}

export function JobFilters({
  remoteOnly,
  onToggleRemoteOnly,
  savedOnly = false,
  onToggleSavedOnly,
  showDismissed = false,
  onToggleShowDismissed,
  selectedSkill,
  onSelectSkill,
  availableSkills,
}: JobFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* Saved Filter */}
      {onToggleSavedOnly && (
        <button
          type="button"
          onClick={() => onToggleSavedOnly(!savedOnly)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
            savedOnly
              ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
              : "bg-slate-900/60 text-slate-400 border-white/10 hover:border-white/20"
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          Saved Only
        </button>
      )}

      {/* Remote Toggle Filter */}
      <button
        type="button"
        onClick={() => onToggleRemoteOnly(!remoteOnly)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
          remoteOnly
            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
            : "bg-slate-900/60 text-slate-400 border-white/10 hover:border-white/20"
        }`}
      >
        <Globe className="w-3.5 h-3.5" />
        Remote Only
      </button>

      {/* Show Dismissed Filter */}
      {onToggleShowDismissed && (
        <button
          type="button"
          onClick={() => onToggleShowDismissed(!showDismissed)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
            showDismissed
              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
              : "bg-slate-900/60 text-slate-400 border-white/10 hover:border-white/20"
          }`}
        >
          <EyeOff className="w-3.5 h-3.5" />
          {showDismissed ? "Showing Dismissed" : "Show Dismissed"}
        </button>
      )}

      {/* Skill Filter Dropdown */}
      <div className="flex items-center gap-1.5 bg-slate-900/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-300">
        <Filter className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <select
          value={selectedSkill}
          onChange={(e) => onSelectSkill(e.target.value)}
          className="bg-transparent outline-none text-white cursor-pointer"
        >
          <option value="" className="bg-slate-900 text-slate-300">
            All Skills
          </option>
          {availableSkills.map((sk) => (
            <option key={sk} value={sk} className="bg-slate-900 text-white">
              {sk}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

