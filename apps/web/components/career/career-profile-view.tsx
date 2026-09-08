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
      const response = await fetch("/api/career-profile", { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json()) as MasterCareerProfile;
        setProfile(data);
      } else {
        const body = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        setError(body.message ?? "Failed to load master career profile.");
      }
    } catch {
      setError("Network error: unable to load career profile.");
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
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        <span className="text-xs">Loading Master Career Profile...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#0b0f19]/90 p-6 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <UserCheck className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Career Profile
            </h1>
            <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-300">
              Source of Truth · v{profile?.version ?? 1}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400 max-w-2xl leading-relaxed">
            Your single repository of verified career evidence. All targeted resumes, job match scores, and AI recommendations pull strictly from here without fabricating unverifiable claims.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchProfile()}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/[0.05] transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setShowImportDialog(true)}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:from-indigo-500 hover:to-purple-500 transition-all"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import Resume / LaTeX</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      {profile && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl border border-white/[0.06] bg-slate-900/60 p-3.5 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <Briefcase className="h-4 w-4" />
            </div>
            <div>
              <div className="text-base font-bold text-white">
                {profile.experiences.length}
              </div>
              <div className="text-[11px] text-slate-400">Experience Roles</div>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-slate-900/60 p-3.5 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
              <Code2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-base font-bold text-white">
                {profile.skills.length}
              </div>
              <div className="text-[11px] text-slate-400">Cataloged Skills</div>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-slate-900/60 p-3.5 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
              <FolderGit2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-base font-bold text-white">
                {profile.projects.length}
              </div>
              <div className="text-[11px] text-slate-400">Highlighted Projects</div>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-slate-900/60 p-3.5 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div>
              <div className="text-base font-bold text-white">
                {profile.education.length}
              </div>
              <div className="text-[11px] text-slate-400">Education Entries</div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Master Profile Editor */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0b0f19]/80 p-4 sm:p-6 backdrop-blur-sm">
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
