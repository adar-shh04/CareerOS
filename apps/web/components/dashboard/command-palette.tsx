"use client";

import {
  Bot,
  Briefcase,
  CheckSquare,
  FilePlus2,
  FileText,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Radar,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/providers/auth-provider";

interface CommandItem {
  id: string;
  category: "Navigation" | "Actions";
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onSelect?: () => void | Promise<void>;
  shortcut?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: CommandItem[] = useMemo(
    () => [
      // Navigation
      {
        id: "nav-dashboard",
        category: "Navigation",
        title: "Command Center Dashboard",
        subtitle: "Overview of your career progress and opportunities",
        icon: LayoutDashboard,
        href: "/dashboard",
      },
      {
        id: "nav-career",
        category: "Navigation",
        title: "Career Profile",
        subtitle: "Manage verified career evidence, skills, and experience",
        icon: User,
        href: "/career",
      },
      {
        id: "nav-jobs",
        category: "Navigation",
        title: "Job Radar",
        subtitle: "Explore deterministic matching job opportunities",
        icon: Radar,
        href: "/jobs",
      },
      {
        id: "nav-resumes",
        category: "Navigation",
        title: "Resume Studio",
        subtitle: "View, tailor, and branch targeted resumes",
        icon: FileText,
        href: "/resumes",
      },
      {
        id: "nav-applications",
        category: "Navigation",
        title: "Applications Pipeline",
        subtitle: "Track your job submissions and interview stages",
        icon: CheckSquare,
        href: "/applications",
      },
      {
        id: "nav-coach",
        category: "Navigation",
        title: "AI Career Coach",
        subtitle: "Receive grounded resume critiques and advice",
        icon: Bot,
        href: "/coach",
      },
      {
        id: "nav-insights",
        category: "Navigation",
        title: "Market Insights",
        subtitle: "Skill demand and career handbook guidance",
        icon: TrendingUp,
        href: "/insights",
      },
      {
        id: "nav-settings",
        category: "Navigation",
        title: "Account & Settings",
        subtitle: "Manage BYOK AI keys and account preferences",
        icon: Settings,
        href: "/settings",
      },

      // Actions
      {
        id: "act-profile",
        category: "Actions",
        title: "Update Career Profile",
        subtitle: "Add skills, experience, or certifications",
        icon: Sparkles,
        href: "/career",
      },
      {
        id: "act-jobs",
        category: "Actions",
        title: "Discover Market Jobs",
        subtitle: "Search and filter matching roles",
        icon: Briefcase,
        href: "/jobs",
      },
      {
        id: "act-resume",
        category: "Actions",
        title: "Create Targeted Resume",
        subtitle: "Build a new targeted resume version",
        icon: FilePlus2,
        href: "/resumes/new",
      },
      {
        id: "act-track",
        category: "Actions",
        title: "Track New Application",
        subtitle: "Add a submission to your pipeline CRM",
        icon: CheckSquare,
        href: "/applications",
      },
      {
        id: "act-byok",
        category: "Actions",
        title: "Configure BYOK Keys",
        subtitle: "Connect OpenAI, Anthropic, or Gemini API keys",
        icon: KeyRound,
        href: "/settings",
      },
      {
        id: "act-logout",
        category: "Actions",
        title: "Sign Out of CareerOS",
        subtitle: "Terminate active session",
        icon: LogOut,
        onSelect: () => {
          void logout();
        },
      },
    ],
    [logout],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.subtitle?.toLowerCase().includes(q) ?? false),
    );
  }, [commands, query]);

  // Reset selected index when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filtered.length - 1 ? prev + 1 : 0,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filtered.length - 1,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = filtered[selectedIndex];
        if (selected) {
          onOpenChange(false);
          if (selected.onSelect) {
            void selected.onSelect();
          } else if (selected.href) {
            router.push(selected.href);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, filtered, selectedIndex, onOpenChange, router]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 sm:pt-28"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Dialog Body */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all">
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
          <Search className="h-5 w-5 shrink-0 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, page name, or action..."
            className="flex-1 bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
            autoFocus
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No matching commands or pages found.
            </div>
          ) : (
            filtered.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;

              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => {
                    onOpenChange(false);
                    if (item.onSelect) {
                      void item.onSelect();
                    } else if (item.href) {
                      router.push(item.href);
                    }
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-blue-50/80 text-blue-900"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      isSelected
                        ? "bg-[#1d68ed] text-white shadow-2xs"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{item.title}</span>
                      <span className="rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500">
                        {item.category}
                      </span>
                    </div>
                    {item.subtitle && (
                      <p className="truncate text-[11px] text-slate-500 mt-0.5">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hints */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span>Use</span>
            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-600 shadow-2xs">
              ↑
            </kbd>
            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-600 shadow-2xs">
              ↓
            </kbd>
            <span>to navigate</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-600 shadow-2xs">
              ↵
            </kbd>
            <span>to select</span>
          </div>
        </div>
      </div>
    </div>
  );
}
