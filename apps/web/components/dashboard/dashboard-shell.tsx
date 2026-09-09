"use client";

import {
  Bell,
  CheckSquare,
  FileText,
  LayoutDashboard,
  Menu,
  Radar,
  Settings,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";
import React, { useState } from "react";

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { name: "Job Radar", href: "/jobs", icon: Radar },
  { name: "Career Profile", href: "/career", icon: User },
  { name: "Resume Studio", href: "/resumes", icon: FileText },
  { name: "Applications", href: "/applications", icon: CheckSquare },
  { name: "Insights", href: "/insights", icon: TrendingUp },
];

export interface DashboardShellProps extends PropsWithChildren {
  breadcrumb?: string;
  maxWidth?: number;
  userName?: string;
  userRole?: string;
  userAvatarUrl?: string;
  currentDate?: string;
  unreadNotifications?: boolean;
}

export function DashboardShell({
  children,
  breadcrumb = "Dashboard",
  maxWidth = 1400,
  userName = "Alex R.",
  userRole = "(Pro)",
  userAvatarUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80",
  currentDate = "Thursday, March 14, 2024",
  unreadNotifications = true,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isNavActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafd] text-[#0f172a] font-sans selection:bg-[#1d68ed]/15 selection:text-[#1d68ed]">
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Fixed Dark Left Sidebar (w-64) ───────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col justify-between bg-[#0d131f] border-r border-[#1a2333] transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col flex-1">
          {/* Brand Header */}
          <div className="flex h-16 items-center justify-between px-6">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 focus:outline-hidden"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="text-2xl font-bold tracking-tight text-white">
                Career
              </span>
              <span className="text-2xl font-black tracking-tight text-[#38bdf8]">
                OS
              </span>
            </Link>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800/80 hover:text-white lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Primary Navigation (6 items) */}
          <nav className="mt-4 flex-1 space-y-1 px-3" aria-label="Sidebar">
            {NAV_ITEMS.map((item) => {
              const active = isNavActive(item);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`group flex items-center gap-3.5 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-[#182234] text-white shadow-xs"
                      : "text-slate-400 hover:bg-[#141c2c] hover:text-white"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      active
                        ? "text-[#38bdf8]"
                        : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Pinned Section (Settings & User Profile) */}
        <div className="border-t border-[#1a2333] p-4">
          {/* Settings Link */}
          <Link
            href="/settings"
            onClick={() => setMobileMenuOpen(false)}
            className={`group flex items-center gap-3.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname.startsWith("/settings")
                ? "bg-[#182234] text-white"
                : "text-slate-400 hover:bg-[#141c2c] hover:text-white"
            }`}
          >
            <Settings className="h-4 w-4 text-slate-400 group-hover:text-slate-200" />
            <span>Settings</span>
          </Link>

          {/* User Profile Badge */}
          <div className="mt-4 pt-3 border-t border-[#1a2333]/80">
            <div className="px-2 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                User Profile
              </span>
            </div>

            <div className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#141c2c]">
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-slate-700 bg-slate-800">
                {userAvatarUrl ? (
                  <Image
                    src={userAvatarUrl}
                    alt={userName}
                    width={36}
                    height={36}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-700 text-xs font-semibold text-white">
                    {userName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="truncate text-xs font-semibold text-white">
                    {userName}
                  </span>
                  <span className="shrink-0 text-[11px] text-slate-400 font-medium">
                    {userRole}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Canvas Wrapper (offset by sidebar w-64 on desktop) ── */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Top Utility Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 sm:px-6 lg:px-8 backdrop-blur-md">
          {/* Left: Mobile Toggle & Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <nav aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2 text-sm">
                <li>
                  <span className="font-semibold text-slate-800">
                    {breadcrumb}
                  </span>
                </li>
              </ol>
            </nav>
          </div>

          {/* Right: Date Indicator & Notifications */}
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-slate-500 hidden sm:inline-block">
              {currentDate}
            </span>

            {/* Notification Bell */}
            <button
              type="button"
              className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadNotifications && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Content Container */}
        <main
          className="flex-1 w-full mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
          style={{ maxWidth: `${String(maxWidth)}px` }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}