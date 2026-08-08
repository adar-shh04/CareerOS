"use client";

import { Search, X } from "lucide-react";
import React from "react";

interface JobSearchProps {
  value: string;
  onChange: (val: string) => void;
  onSearch: () => void;
}

export function JobSearch({ value, onChange, onSearch }: JobSearchProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex-1">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search jobs by title, company, skills, or location..."
          className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white placeholder-slate-400 text-sm outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/60 transition-all"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              onSearch();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </form>
  );
}
