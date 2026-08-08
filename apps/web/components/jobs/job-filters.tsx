"use client";

import { Filter, Globe } from "lucide-react";
import React from "react";

interface JobFiltersProps {
  remoteOnly: boolean;
  onToggleRemoteOnly: (val: boolean) => void;
  selectedSkill: string;
  onSelectSkill: (skill: string) => void;
  availableSkills: string[];
}

export function JobFilters({
  remoteOnly,
  onToggleRemoteOnly,
  selectedSkill,
  onSelectSkill,
  availableSkills,
}: JobFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
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
