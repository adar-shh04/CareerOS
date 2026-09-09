"use client";

import type { ResumeProfile, ResumeVersion } from "@repo/types";
import {
  ArrowLeft,
  Loader2,
  Printer,
} from "lucide-react";
import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";

import { ResumePreview } from "../resume-intelligence/resume-preview";

interface ResumeVersionViewerProps {
  profileId: string;
  versionId: string;
}

export function ResumeVersionViewer({
  profileId,
  versionId,
}: ResumeVersionViewerProps) {
  const [version, setVersion] = useState<ResumeVersion | null>(null);
  const [profile, setProfile] = useState<ResumeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVersionData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [vRes, pRes] = await Promise.all([
        fetch(`/api/resume-profiles/${profileId}/versions/${versionId}`, {
          cache: "no-store",
        }),
        fetch(`/api/resume-profiles/${profileId}`, { cache: "no-store" }),
      ]);

      if (!vRes.ok) {
        throw new Error("Resume version snapshot not found.");
      }

      const vData = (await vRes.json()) as ResumeVersion;
      setVersion(vData);

      if (pRes.ok) {
        const pData = (await pRes.json()) as ResumeProfile;
        setProfile(pData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load version.");
    } finally {
      setLoading(false);
    }
  }, [profileId, versionId]);

  useEffect(() => {
    void loadVersionData();
  }, [loadVersionData]);

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin text-[#1d68ed]" />
        <span className="text-xs font-medium">Loading persistent version snapshot...</span>
      </div>
    );
  }

  if (!version) {
    return (
      <div className="max-w-4xl mx-auto rounded-xl border border-slate-200/80 bg-white p-8 text-center space-y-4 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900">Version Not Found</h2>
        <p className="text-xs text-slate-500">
          {error ?? "The requested resume version snapshot could not be retrieved."}
        </p>
        <Link
          href={`/resumes/${profileId}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Profile Workspace
        </Link>
      </div>
    );
  }

  const snapshot = version.masterProfileSnapshot;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/resumes/${profileId}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {profile?.name ?? "Profile Workspace"}</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Hero Header */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded border border-blue-200/80 bg-blue-50 px-2 py-0.5 text-[10px] uppercase font-bold text-[#1d68ed]">
                Immutable Snapshot
              </span>
              <span className="text-xs text-slate-500">
                Created {new Date(version.createdAt).toLocaleString()}
              </span>
            </div>

            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {version.targetCompany
                ? `${version.targetCompany} — ${version.targetRole ?? "Targeted Role"}`
                : `${profile?.name ?? "Resume"} Snapshot`}
            </h1>

            <p className="text-xs text-slate-500">
              Frozen state from Master Career Profile v{snapshot.version} · Format: {version.outputFormat.toUpperCase()}
            </p>
          </div>

          {version.confidence != null && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-right">
              <div className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider">Targeting Match</div>
              <div className="text-lg font-extrabold text-emerald-700">
                {Math.round(version.confidence * 100)}%
              </div>
            </div>
          )}
        </div>

        {/* Targeting explanation if job-targeted */}
        {version.explanation && (
          <div className="rounded-xl border border-blue-100 bg-[#f4f8ff] p-3.5 text-xs text-slate-800 leading-relaxed">
            <span className="font-bold text-[#1d68ed]">Targeting Rationale:</span>{" "}
            {version.explanation}
          </div>
        )}
      </div>

      {/* Resume Live Preview */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <ResumePreview
          masterProfile={snapshot}
          selectedProfile={profile}
          selectedVersion={version}
        />
      </div>
    </div>
  );
}
