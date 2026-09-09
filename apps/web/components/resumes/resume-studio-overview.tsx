"use client";

import type { ResumeProfile, ResumeVersion } from "@repo/types";
import {
  ArrowRight,
  Clock,
  Eye,
  FileCode,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";

export function ResumeStudioOverview() {
  const [profiles, setProfiles] = useState<ResumeProfile[]>([]);
  const [recentVersions, setRecentVersions] = useState<
    { profile: ResumeProfile; version: ResumeVersion }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/resume-profiles", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to load resume profiles.");
      }
      const profs = (await res.json()) as ResumeProfile[];
      setProfiles(profs);

      // Fetch versions for all profiles to compile version inventory
      const allVersions: { profile: ResumeProfile; version: ResumeVersion }[] =
        [];
      await Promise.all(
        profs.map(async (p) => {
          try {
            const vRes = await fetch(`/api/resume-profiles/${p.id}/versions`, {
              cache: "no-store",
            });
            if (vRes.ok) {
              const vers = (await vRes.json()) as ResumeVersion[];
              vers.forEach((v) => allVersions.push({ profile: p, version: v }));
            }
          } catch {
            /* ignore single profile failure */
          }
        }),
      );

      // Sort newest versions first
      allVersions.sort(
        (a, b) =>
          new Date(b.version.createdAt).getTime() -
          new Date(a.version.createdAt).getTime(),
      );
      setRecentVersions(allVersions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load resumes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin text-[#1d68ed]" />
        <span className="text-xs font-medium">Loading Resume Studio inventory...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#1d68ed] border border-blue-200/80">
              <FileText className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Resume Studio
            </h1>
            <span className="rounded-full border border-blue-200/80 bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-[#1d68ed]">
              Persistent Asset Management
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 max-w-2xl leading-relaxed">
            Resumes in CareerOS are persistent, versioned documents tailored per role focus — not disposable AI text dumps. Every version maintains full traceability to your Master Career Profile.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadData()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>Refresh</span>
          </button>

          <Link
            href="/resumes/new"
            className="flex items-center gap-1.5 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Resume Profile</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 shadow-2xs">
          {error}
        </div>
      )}

      {/* Profiles Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Configured Resume Profiles ({profiles.length})
          </h2>
          <span className="text-xs text-slate-500">
            Each profile targets a specific role track or style template
          </span>
        </div>

        {profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center gap-3 shadow-xs">
            <FileCode className="w-8 h-8 text-[#1d68ed]" />
            <div className="text-sm font-bold text-slate-900">
              No Resume Profiles Yet
            </div>
            <p className="text-xs text-slate-500 max-w-sm text-center">
              Create your first profile to customize section orders, choose priority skills from your master evidence, or import a custom LaTeX template.
            </p>
            <Link
              href="/resumes/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Profile Now
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((p) => {
              const versionCount = recentVersions.filter(
                (v) => v.profile.id === p.id,
              ).length;
              return (
                <div
                  key={p.id}
                  className="rounded-xl border border-slate-200/80 bg-white p-5 space-y-3 flex flex-col justify-between hover:border-slate-300 transition-colors group shadow-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-slate-900 group-hover:text-[#1d68ed] transition-colors text-sm">
                        {p.name}
                      </h3>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600 font-medium">
                        {versionCount} {versionCount === 1 ? "version" : "versions"}
                      </span>
                    </div>

                    <p className="text-xs text-[#1d68ed] font-semibold">
                      {p.roleFocus ?? "General Professional Focus"}
                    </p>

                    {p.summaryGuidance && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {p.summaryGuidance}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-500">
                      Updated {new Date(p.updatedAt).toLocaleDateString()}
                    </span>
                    <Link
                      href={`/resumes/${p.id}`}
                      className="inline-flex items-center gap-1 text-[#1d68ed] hover:text-[#1555c8] font-semibold text-xs transition-colors"
                    >
                      Open Workspace <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Persistent Versions Inventory */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Persistent Version Archive ({recentVersions.length})
          </h2>
          <span className="text-xs text-slate-500">
            Immutable snapshots tailored for specific jobs and applications
          </span>
        </div>

        {recentVersions.length === 0 ? (
          <div className="rounded-xl border border-slate-200/80 bg-white p-6 text-center text-xs text-slate-500 shadow-xs">
            No versions targeted yet. When you target a job in Job Radar or generate a snapshot, it is preserved here permanently.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200/80 bg-white divide-y divide-slate-100 overflow-hidden shadow-xs">
            {recentVersions.slice(0, 10).map(({ profile, version }) => (
              <div
                key={version.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-xs">
                      {version.targetCompany
                        ? `${version.targetCompany} — ${version.targetRole ?? "Targeted Role"}`
                        : profile.name}
                    </span>
                    <span className="rounded border border-blue-200/80 bg-blue-50 px-1.5 py-0.5 text-[9px] uppercase font-bold text-[#1d68ed]">
                      {version.outputFormat}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-3">
                    <span>Profile: {profile.name}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(version.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {version.confidence != null && (
                      <>
                        <span>·</span>
                        <span className="text-emerald-700 font-semibold">
                          Confidence: {Math.round(version.confidence * 100)}%
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/resumes/${profile.id}/versions/${version.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Snapshot</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
