"use client";

import {
  Bot,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Radar,
  Search,
  Settings,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";
import React, { useEffect, useState } from "react";

import { useAuth } from "@/providers/auth-provider";

import { CommandPalette } from "./command-palette";

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
  { name: "AI Coach", href: "/coach", icon: Bot },
  { name: "Insights", href: "/insights", icon: TrendingUp },
];

export interface DashboardShellProps extends PropsWithChildren {
  breadcrumb?: string;
  maxWidth?: number;
  userName?: string;
  userRole?: string;
  userAvatarUrl?: string;
}

export function DashboardShell({
  children,
  breadcrumb = "Dashboard",
  maxWidth = 1400,
  userName,
  userRole,
  userAvatarUrl,
}: DashboardShellProps) {
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Authentically derive user identity from prop or active session
  const effectiveName =
    userName ??
    session?.user.name ??
    session?.user.email.split("@")[0] ??
    "User";

  const effectiveRole =
    userRole ??
    (session?.workspace.name ? `(${session.workspace.name})` : "");

  const effectiveAvatar = userAvatarUrl ?? session?.user.avatar ?? null;

  // Safe client hydration for sidebar collapse state
  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem("careeros_sidebar_collapsed");
    if (saved === "true") {
      setIsCollapsed(true);
    }
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("careeros_sidebar_collapsed", String(next));
      return next;
    });
  };

  // Keyboard shortcut listener for ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isNavActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  // Single source of truth for sidebar widths
  const sidebarWidthClass = isCollapsed && isMounted ? "w-20" : "w-64";

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

      {/* ── Collapsible Dark Left Sidebar (in-flow sticky on desktop, off-canvas drawer on mobile) ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 lg:sticky lg:top-0 lg:h-screen lg:z-30 shrink-0 flex flex-col justify-between bg-[#0d131f] border-r border-[#1a2333] transition-all duration-300 ease-in-out ${sidebarWidthClass} ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
          {/* Brand Header & Toggle */}
          <div
            className={`shrink-0 flex h-16 items-center justify-between border-b border-[#1a2333]/80 px-4 ${
              isCollapsed && isMounted ? "justify-center px-2" : ""
            }`}
          >
            {isCollapsed && isMounted ? (
              <div className="flex flex-col items-center gap-1">
                <Link
                  href="/dashboard"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#1d68ed] to-[#38bdf8] text-white font-black text-sm shadow-xs"
                  title="CareerOS"
                >
                  OS
                </Link>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="hidden lg:flex p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800/60 transition-colors cursor-pointer"
                  title="Expand sidebar"
                  aria-label="Expand sidebar"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <>
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

                <div className="flex items-center gap-1">
                  {/* Desktop Collapse Button */}
                  <button
                    type="button"
                    onClick={toggleSidebar}
                    className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer"
                    title="Collapse sidebar"
                    aria-label="Collapse sidebar"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {/* Mobile close button */}
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800/80 hover:text-white lg:hidden cursor-pointer"
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Primary Navigation */}
          <nav className="mt-4 flex-1 space-y-1 px-2.5" aria-label="Sidebar">
            {NAV_ITEMS.map((item) => {
              const active = isNavActive(item);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  title={isCollapsed && isMounted ? item.name : undefined}
                  className={`group flex items-center rounded-xl text-sm font-medium transition-all ${
                    isCollapsed && isMounted
                      ? "h-11 w-11 justify-center mx-auto p-0"
                      : "gap-3.5 px-3.5 py-2.5"
                  } ${
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
                  {(!isCollapsed || !isMounted) && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Settings, Logout, and User Profile */}
        <div className="shrink-0 border-t border-[#1a2333] p-3 space-y-1.5">
          {/* Settings Link */}
          <Link
            href="/settings"
            onClick={() => setMobileMenuOpen(false)}
            title={isCollapsed && isMounted ? "Account & Settings" : undefined}
            className={`group flex items-center rounded-xl text-sm font-medium transition-colors ${
              isCollapsed && isMounted
                ? "h-10 w-10 justify-center mx-auto p-0"
                : "gap-3 px-3 py-2"
            } ${
              pathname.startsWith("/settings")
                ? "bg-[#182234] text-white"
                : "text-slate-400 hover:bg-[#141c2c] hover:text-white"
            }`}
          >
            <Settings className="h-4 w-4 text-slate-400 group-hover:text-slate-200" />
            {(!isCollapsed || !isMounted) && <span>Settings</span>}
          </Link>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={() => void logout()}
            title={isCollapsed && isMounted ? "Sign Out" : undefined}
            className={`group flex items-center w-full rounded-xl text-sm font-medium text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 transition-colors cursor-pointer ${
              isCollapsed && isMounted
                ? "h-10 w-10 justify-center mx-auto p-0"
                : "gap-3 px-3 py-2 text-left"
            }`}
          >
            <LogOut className="h-4 w-4 text-slate-400 group-hover:text-rose-400" />
            {(!isCollapsed || !isMounted) && <span>Sign Out</span>}
          </button>

          {/* User Profile Link -> Navigates to /settings */}
          <div className="pt-2 border-t border-[#1a2333]/80">
            <Link
              href="/settings"
              title="Manage Account & Settings"
              className={`flex items-center rounded-xl transition-colors hover:bg-[#141c2c] ${
                isCollapsed && isMounted
                  ? "justify-center p-1.5"
                  : "gap-2.5 px-2 py-1.5"
              }`}
            >
              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-slate-700 bg-slate-800">
                {effectiveAvatar ? (
                  <Image
                    src={effectiveAvatar}
                    alt={effectiveName}
                    width={32}
                    height={32}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-700 text-[11px] font-semibold text-white">
                    {effectiveName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              {(!isCollapsed || !isMounted) && (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 truncate">
                    <span className="truncate text-xs font-semibold text-white">
                      {effectiveName}
                    </span>
                    {effectiveRole && (
                      <span className="shrink-0 text-[10px] text-slate-400 font-medium">
                        {effectiveRole}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate hover:text-[#38bdf8]">
                    Account Settings &rarr;
                  </div>
                </div>
              )}
            </Link>
          </div>
        </div>
      </aside>

      {/* ── Main Canvas Wrapper ── */}
      <div className="flex flex-1 flex-col transition-all duration-300 ease-in-out min-w-0">
        {/* Top Sticky Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 sm:px-6 lg:px-8 backdrop-blur-md">
          {/* Left: Mobile Toggle & Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <nav aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2 text-sm">
                <li>
                  <span className="font-semibold text-slate-900 tracking-tight">
                    {breadcrumb}
                  </span>
                </li>
              </ol>
            </nav>
          </div>

          {/* Center: Command Palette Trigger Button */}
          <div className="flex items-center justify-center flex-1 max-w-md mx-4">
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-1.5 text-xs text-slate-500 hover:border-slate-300 hover:bg-white hover:text-slate-800 transition-all shadow-2xs cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate">Search CareerOS navigation & actions...</span>
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500 shadow-2xs">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right: Settings & User Profile Shortcut */}
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              title="Account & BYOK Settings"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            >
              <Settings className="h-4 w-4" />
            </Link>

            <Link
              href="/settings"
              title="User Account"
              className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-100 transition-colors"
            >
              <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                {effectiveAvatar ? (
                  <Image
                    src={effectiveAvatar}
                    alt={effectiveName}
                    width={28}
                    height={28}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-blue-50 text-[10px] font-semibold text-[#1d68ed]">
                    {effectiveName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            </Link>
          </div>
        </header>

        {/* Main Content Area */}
        <main
          className="flex-1 w-full mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
          style={{ maxWidth: `${String(maxWidth)}px` }}
        >
          {children}
        </main>
      </div>

      {/* Global Command Palette Modal */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
    </div>
  );
}