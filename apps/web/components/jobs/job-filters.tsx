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
    <div className="flex flex-wrap items-center gap-2">
      {/* Saved Filter */}
      {onToggleSavedOnly && (
        <button
          type="button"
          onClick={() => onToggleSavedOnly(!savedOnly)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
            savedOnly
              ? "bg-purple-50 text-purple-700 border-purple-200"
              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900"
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
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
          remoteOnly
            ? "bg-blue-50 text-[#1d68ed] border-blue-200"
            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900"
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
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
            showDismissed
              ? "bg-amber-50 text-amber-800 border-amber-200"
              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900"
          }`}
        >
          <EyeOff className="w-3.5 h-3.5" />
          {showDismissed ? "Showing Dismissed" : "Show Dismissed"}
        </button>
      )}

      {/* Skill Filter Dropdown */}
      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 shadow-2xs">
        <Filter className="w-3.5 h-3.5 text-[#1d68ed] shrink-0" />
        <select
          value={selectedSkill}
          onChange={(e) => onSelectSkill(e.target.value)}
          className="bg-transparent outline-none text-slate-800 cursor-pointer"
        >
          <option value="" className="bg-white text-slate-500">
            All Skills
          </option>
          {availableSkills.map((sk) => (
            <option key={sk} value={sk} className="bg-white text-slate-900">
              {sk}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

