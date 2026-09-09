"use client";

import {
  Building2,
  CheckCircle2,
  LogOut,
  Shield,
  Sparkles,
  User,
} from "lucide-react";
import Link from "next/link";
import React from "react";

import { useAuth } from "@/providers/auth-provider";

import { ByokSettingsView } from "./byok-settings-view";

interface AccountSettingsViewProps {
  userName?: string;
  userEmail?: string;
  workspaceName?: string;
  workspaceSlug?: string;
}

export function AccountSettingsView({
  userName,
  userEmail,
  workspaceName,
  workspaceSlug,
}: AccountSettingsViewProps) {
  const { session, logout } = useAuth();

  const activeName =
    userName ??
    session?.user.name ??
    session?.user.email.split("@")[0] ??
    "User";
  const activeEmail = userEmail ?? session?.user.email ?? "";
  const activeWsName = workspaceName ?? session?.workspace.name ?? "Workspace";
  const activeWsSlug = workspaceSlug ?? session?.workspace.slug ?? "";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Account & Settings
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Manage your account identity, workspace session, and BYOK AI keys.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 shadow-2xs">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-[#1d68ed]">
              {activeName.slice(0, 2).toUpperCase()}
            </div>
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-900 truncate max-w-[120px]">
                {activeName}
              </div>
              <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                {activeWsSlug}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid Layout: 2 Columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (5 cols): Identity & Security */}
        <div className="space-y-6 lg:col-span-5">
          {/* Card 1: Account Profile & Workspace */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-800">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-[#1d68ed]">
                <User className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider">
                Account Identity
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Full Name
                </span>
                <div className="font-semibold text-slate-900 text-sm">
                  {activeName}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Email Address
                </span>
                <div className="font-semibold text-slate-900 text-sm truncate">
                  {activeEmail}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 space-y-1">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <Building2 className="h-3 w-3" />
                  <span>Active Workspace</span>
                </div>
                <div className="flex items-center justify-between font-semibold text-slate-900 text-sm">
                  <span>{activeWsName}</span>
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-mono text-[#1d68ed]">
                    {activeWsSlug}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/career"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1d68ed] hover:text-[#1555c8] hover:underline"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Edit Career Profile Evidence &rarr;</span>
              </Link>
            </div>
          </div>

          {/* Card 2: Security & Session */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-800">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Shield className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider">
                Security & Session
              </h2>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <div className="text-xs">
                <div className="font-semibold text-emerald-950">
                  Authenticated Session Active
                </div>
                <div className="text-[11px] text-emerald-700">
                  Protected by Better Auth multi-tenant workspace isolation.
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => void logout()}
                className="inline-flex items-center justify-center gap-2 w-full rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100/80 transition-colors shadow-2xs cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out of CareerOS</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): BYOK Intelligence Key Management */}
        <div className="space-y-6 lg:col-span-7">
          <ByokSettingsView />
        </div>
      </div>
    </div>
  );
}
