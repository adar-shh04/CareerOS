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
          className="w-full pl-10 pr-9 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs outline-none focus:border-[#1d68ed] focus:ring-2 focus:ring-[#1d68ed]/20 transition-all shadow-2xs"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              onSearch();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </form>
  );
}
