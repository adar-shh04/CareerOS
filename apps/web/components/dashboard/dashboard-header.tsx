"use client";

import {
  Bot,
  BrainCircuit,
  Briefcase,
  Compass,
  FileText,
  KeyRound,
  LogOut,
  Menu,
  Target,
  TrendingUp,
  User,
  UserCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";

import { useAuth } from "../../providers/auth-provider";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Command Center", icon: Compass, exact: true },
  { href: "/career", label: "Career Profile", icon: UserCheck },
  { href: "/jobs", label: "Job Radar", icon: Briefcase },
  { href: "/resumes", label: "Resume Studio", icon: FileText },
  { href: "/applications", label: "Applications", icon: TrendingUp },
  { href: "/coach", label: "AI Coach", icon: Bot },
  { href: "/insights", label: "Insights", icon: Target },
  { href: "/settings", label: "Settings", icon: KeyRound },
];

export function DashboardHeader() {
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [byokConfigured, setByokConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/byok/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { configured?: boolean } | null) => {
        if (isMounted && data) {
          setByokConfigured(Boolean(data.configured));
        }
      })
      .catch(() => {
        if (isMounted) setByokConfigured(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const isItemActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#0b0f19]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand & Desktop Navigation */}
        <div className="flex items-center gap-6 xl:gap-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 transition-opacity hover:opacity-90"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-md shadow-indigo-600/30">
              <BrainCircuit className="h-5 w-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <div className="text-base font-bold tracking-tight text-white">
                CareerOS
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                Career Operating System
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? "bg-indigo-600/20 text-white border border-indigo-500/30 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 ${
                      active ? "text-indigo-400" : "text-slate-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* BYOK Status Badge */}
          <Link
            href="/settings"
            title="Configure BYOK AI Keys in Settings"
            className={`hidden sm:flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors ${
              byokConfigured
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                : "bg-slate-800/60 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <KeyRound className="h-3 w-3" />
            <span>{byokConfigured ? "BYOK Active" : "Setup BYOK"}</span>
          </Link>

          {/* User Profile / Workspace Chip */}
          <div className="hidden md:flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs text-slate-300">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600/30 text-indigo-300">
              <User className="h-3 w-3" />
            </div>
            <span className="max-w-[120px] truncate font-medium">
              {session?.user.name ?? session?.user.email ?? "User"}
            </span>
          </div>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={() => void logout()}
            title="Sign out of CareerOS"
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-xs text-slate-400 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-300 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex lg:hidden items-center justify-center rounded-lg border border-white/10 p-1.5 text-slate-300 hover:bg-white/[0.05]"
            aria-label="Toggle Navigation Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="border-t border-white/[0.08] bg-[#0b0f19] px-4 py-3 lg:hidden space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-600/20 text-white font-semibold"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-indigo-400" : ""}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
