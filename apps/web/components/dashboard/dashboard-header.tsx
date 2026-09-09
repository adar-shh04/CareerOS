"use client";

import {
  Bot,
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
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand & Desktop Navigation */}
        <div className="flex items-center gap-6 xl:gap-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1d68ed] text-white shadow-xs">
              <Compass className="h-4 w-4" />
            </div>
            <div className="hidden sm:block">
              <div className="text-base font-bold tracking-tight text-slate-900">
                Career<span className="text-[#1d68ed]">OS</span>
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
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
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? "bg-blue-50 text-[#1d68ed] border border-blue-200/80 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 ${
                      active ? "text-[#1d68ed]" : "text-slate-500"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* BYOK Status Badge */}
          <Link
            href="/settings"
            title="Configure BYOK AI Keys in Settings"
            className={`hidden sm:flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors ${
              byokConfigured
                ? "bg-blue-50 border-blue-200/80 text-[#1d68ed] hover:bg-blue-100/60"
                : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300"
            }`}
          >
            <KeyRound className="h-3 w-3" />
            <span>{byokConfigured ? "BYOK Active" : "Setup BYOK"}</span>
          </Link>

          {/* User Profile / Workspace Chip */}
          <div className="hidden md:flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-xs text-slate-800 shadow-xs">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-[#1d68ed] font-semibold text-[10px]">
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
            className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-colors shadow-xs"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex lg:hidden items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 hover:bg-slate-50"
            aria-label="Toggle Navigation Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="border-t border-slate-200/80 bg-white px-4 py-3 lg:hidden space-y-1">
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
                    ? "bg-blue-50 text-[#1d68ed] font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-[#1d68ed]" : ""}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
