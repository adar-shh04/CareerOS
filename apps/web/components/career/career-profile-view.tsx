"use client";

import type {
  MasterCareerProfile,
  MasterCareerProfileInput,
} from "@repo/types";
import {
  Briefcase,
  Code2,
  FolderGit2,
  GraduationCap,
  Loader2,
  RefreshCw,
  Upload,
  UserCheck,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

import { MasterProfileEditor } from "../resume-intelligence/master-profile-editor";
import { ResumeImportDialog } from "../resume-intelligence/resume-import-dialog";

export function CareerProfileView() {
  const [profile, setProfile] = useState<MasterCareerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/career-profile", {
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) {
        const data = (await response.json()) as MasterCareerProfile;
        setProfile(data);
      } else {
        const body = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        setError(body.message ?? "Failed to load master career profile.");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "TimeoutError") {
        setError("Request timed out: backend took too long to respond.");
      } else {
        setError("Network error: unable to load career profile.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const handleSaveProfile = async (updatedInput: MasterCareerProfileInput) => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/career-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedInput),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(body.message ?? "Failed to save profile.");
      }

      const saved = (await response.json()) as MasterCareerProfile;
      setProfile(saved);
    } finally {
      setSaving(false);
    }
  };

  const handleImportComplete = async (
    importedData: MasterCareerProfileInput,
  ) => {
    await handleSaveProfile(importedData);
    setShowImportDialog(false);
    void fetchProfile();
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs animate-pulse space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-slate-200" />
            <div className="h-5 w-48 bg-slate-200 rounded-md" />
          </div>
          <div className="h-3.5 w-full max-w-lg bg-slate-100 rounded-md" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-xl border border-slate-200/80 bg-white p-4 animate-pulse space-y-2">
              <div className="h-3 w-16 bg-slate-200 rounded-md" />
              <div className="h-5 w-10 bg-slate-200 rounded-md" />
            </div>
          ))}
        </div>
        <div className="h-96 rounded-xl border border-slate-200/80 bg-white p-6 animate-pulse flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#1d68ed]" />
          <span className="text-xs text-slate-500 font-medium">Loading Master Career Profile...</span>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-xl border border-rose-200 bg-white p-8 text-center shadow-xs space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 mx-auto">
            <RefreshCw className="h-6 w-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-900">
              Unable to Load Career Profile
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {error}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => void fetchProfile()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>
            <button
              type="button"
              onClick={() => setShowImportDialog(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-medium text-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5 text-slate-500" />
              <span>Import Resume Instead</span>
            </button>
          </div>
        </div>

        {showImportDialog && (
          <ResumeImportDialog
            onClose={() => setShowImportDialog(false)}
            onImportComplete={handleImportComplete}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0d131f] text-[#38bdf8] shadow-xs">
              <UserCheck className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Career Profile
            </h1>
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-[#1d68ed]">
              Source of Truth · v{profile?.version ?? 1}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 max-w-2xl leading-relaxed">
            Your single repository of verified career evidence. All targeted resumes, job match scores, and AI recommendations pull strictly from here without fabricating unverifiable claims.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void fetchProfile()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setShowImportDialog(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import Resume / LaTeX</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      {profile && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 flex items-center gap-3 shadow-xs">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[#1d68ed]">
              <Briefcase className="h-4 w-4" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">
                {profile.experiences.length}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">Experience Roles</div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-4 flex items-center gap-3 shadow-xs">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Code2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">
                {profile.skills.length}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">Cataloged Skills</div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-4 flex items-center gap-3 shadow-xs">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <FolderGit2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">
                {profile.projects.length}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">Highlighted Projects</div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-4 flex items-center gap-3 shadow-xs">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">
                {profile.education.length}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">Education Entries</div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Master Profile Editor */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <MasterProfileEditor
          profile={profile}
          onSave={handleSaveProfile}
          saving={saving}
        />
      </div>

      {/* Import Dialog */}
      {showImportDialog && (
        <ResumeImportDialog
          onClose={() => setShowImportDialog(false)}
          onImportComplete={handleImportComplete}
        />
      )}
    </div>
  );
}
