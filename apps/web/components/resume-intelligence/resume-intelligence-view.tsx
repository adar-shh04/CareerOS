"use client";

import type {
  CreateResumeVersionInput,
  MasterCareerProfile,
  MasterCareerProfileInput,
  ResumeProfile,
  ResumeProfileInput,
  ResumeVersion,
} from "@repo/types";
import { Eye, FileText, History, Layers, Upload, UserCheck } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

import { MasterProfileEditor } from "./master-profile-editor";
import { ResumeImportDialog } from "./resume-import-dialog";
import { ResumeOverviewCards } from "./resume-overview-cards";
import { ResumePreview } from "./resume-preview";
import { ResumeProfilesManager } from "./resume-profiles-manager";
import { ResumeVersionHistory } from "./resume-version-history";

interface ResumeIntelligenceViewProps {
  initialVersion?: ResumeVersion | null;
  initialProfile?: ResumeProfile | null;
}

export function ResumeIntelligenceView({ initialVersion, initialProfile }: ResumeIntelligenceViewProps = {}) {
  const [subTab, setSubTab] = useState<
    "master" | "profiles" | "versions" | "preview"
  >(initialVersion ? "preview" : "master");

  /* ── State ─────────────────────────────────────────────────────────── */
  const [masterProfile, setMasterProfile] =
    useState<MasterCareerProfile | null>(null);
  const [savingMaster, setSavingMaster] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const [profiles, setProfiles] = useState<ResumeProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    initialProfile?.id ?? null,
  );
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  const [versions, setVersions] = useState<ResumeVersion[]>(
    initialVersion ? [initialVersion] : [],
  );
  const [selectedVersion] = useState<ResumeVersion | null>(
    initialVersion ?? null,
  );
  const [loadingVersions, setLoadingVersions] = useState(false);

  const [error, setError] = useState<{ status: number; message: string } | null>(null);

  /* ── Load Master Career Profile ────────────────────────────────────── */
  const loadMasterProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/career-profile", { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json()) as MasterCareerProfile;
        setMasterProfile(data);
      } else if (response.status === 401) {
        setError({
          status: 401,
          message: "Session expired. Please sign in again.",
        });
      }
    } catch {
      /* network error handled in loadProfiles */
    }
  }, []);

  /* ── Load Resume Profiles ──────────────────────────────────────────── */
  const loadProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    setError(null);
    try {
      const response = await fetch("/api/resume-profiles", { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json()) as ResumeProfile[];
        setProfiles(data);
        if (data.length > 0 && !selectedProfileId) {
          const firstProfile = data[0];
          if (firstProfile) {
            setSelectedProfileId(firstProfile.id);
          }
        }
      } else {
        const body = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        setError({
          status: response.status,
          message:
            body.message ??
            (response.status === 401
              ? "Authentication required. Please sign in."
              : "Failed to load resume profiles."),
        });
      }
    } catch {
      setError({
        status: 0,
        message: "Network error — unable to load resume profiles.",
      });
    } finally {
      setLoadingProfiles(false);
    }
  }, [selectedProfileId]);

  /* ── Load Resume Versions for selected profile ─────────────────────── */
  const loadVersions = useCallback(async (profileId: string) => {
    setLoadingVersions(true);
    try {
      const response = await fetch(
        `/api/resume-profiles/${profileId}/versions`,
        { cache: "no-store" },
      );
      if (response.ok) {
        const data = (await response.json()) as ResumeVersion[];
        setVersions(data);
      }
    } catch {
      setVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  }, []);

  useEffect(() => {
    void loadMasterProfile();
    void loadProfiles();
  }, [loadMasterProfile, loadProfiles]);

  useEffect(() => {
    if (selectedProfileId) {
      void loadVersions(selectedProfileId);
    } else {
      setVersions([]);
    }
  }, [selectedProfileId, loadVersions]);

  /* ── Handlers ──────────────────────────────────────────────────────── */
  async function handleSaveMaster(input: MasterCareerProfileInput) {
    setSavingMaster(true);
    try {
      const response = await fetch("/api/career-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const err = (await response.json()) as { message?: string };
        throw new Error(err.message ?? "Failed to save profile.");
      }

      const updated = (await response.json()) as MasterCareerProfile;
      setMasterProfile(updated);
    } finally {
      setSavingMaster(false);
    }
  }

  async function handleCreateProfile(input: ResumeProfileInput) {
    const response = await fetch("/api/resume-profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const err = (await response.json()) as { message?: string };
      throw new Error(err.message ?? "Failed to create resume profile.");
    }

    const created = (await response.json()) as ResumeProfile;
    setProfiles((prev) => [created, ...prev]);
    setSelectedProfileId(created.id);
  }

  async function handleCreateVersion(input: CreateResumeVersionInput) {
    if (!selectedProfileId) return;

    const response = await fetch(
      `/api/resume-profiles/${selectedProfileId}/versions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    );

    if (!response.ok) {
      const err = (await response.json()) as { message?: string };
      throw new Error(err.message ?? "Failed to generate version snapshot.");
    }

    const created = (await response.json()) as ResumeVersion;
    setVersions((prev) => [created, ...prev]);
  }

  async function handleImportComplete(
    input: MasterCareerProfileInput,
    latexSource?: string,
  ) {
    await handleSaveMaster(input);

    if (latexSource) {
      if (selectedProfileId && selectedProfile) {
        await handleUpdateProfileLatex(latexSource);
      } else {
        await handleCreateProfile({
          name: "Imported Resume Profile",
          roleFocus: input.identity.headline ?? "General Target",
          latexSource,
        });
      }
      setSubTab("preview");
    }
  }

  async function handleUpdateProfileLatex(latex: string) {
    if (!selectedProfileId) return;
    const profile = profiles.find((p) => p.id === selectedProfileId);
    if (!profile) return;

    const response = await fetch(`/api/resume-profiles/${selectedProfileId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...profile,
        latexSource: latex,
      }),
    });

    if (response.ok) {
      const updated = (await response.json()) as ResumeProfile;
      setProfiles((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p)),
      );
    }
  }

  const selectedProfile =
    profiles.find((p) => p.id === selectedProfileId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      {/* Module Header Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-200/80 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#1d68ed] border border-blue-200/80 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Resume Intelligence
            </h2>
            <span className="text-xs text-slate-500">
              Master profile source of truth, targeted LaTeX resume variants, and live studio.
            </span>
          </div>
        </div>

        {/* Sub Navigation Pills */}
        <div className="flex gap-2 flex-wrap items-center">
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Import Resume
          </button>
          {[
            { id: "master", label: "Master Career Profile", icon: UserCheck },
            { id: "profiles", label: `Resume Profiles (${String(profiles.length)})`, icon: Layers },
            { id: "versions", label: `Version History (${String(versions.length)})`, icon: History },
            { id: "preview", label: "Resume Studio Preview", icon: Eye },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id as typeof subTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors border cursor-pointer ${
                  isActive
                    ? "bg-blue-50 text-[#1d68ed] border-blue-200/80 font-semibold shadow-2xs"
                    : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-slate-200 font-medium"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#1d68ed]" : "text-slate-400"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-2xs">
          <span>{error.message}</span>
          <button
            type="button"
            onClick={() => {
              void loadMasterProfile();
              void loadProfiles();
            }}
            className="text-rose-800 underline font-semibold hover:text-rose-950 cursor-pointer text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* Overview Cards */}
      <ResumeOverviewCards
        masterProfile={masterProfile}
        profiles={profiles}
        versions={versions}
      />

      {/* Tab Content */}
      {subTab === "master" && (
        <MasterProfileEditor
          profile={masterProfile}
          onSave={handleSaveMaster}
          saving={savingMaster}
        />
      )}

      {subTab === "profiles" && (
        <ResumeProfilesManager
          profiles={profiles}
          selectedProfileId={selectedProfileId}
          onSelectProfile={setSelectedProfileId}
          onCreateProfile={handleCreateProfile}
          loading={loadingProfiles}
        />
      )}

      {subTab === "versions" && (
        <ResumeVersionHistory
          selectedProfile={selectedProfile}
          versions={versions}
          onCreateVersion={handleCreateVersion}
          loading={loadingVersions}
        />
      )}

      {subTab === "preview" && (
        <ResumePreview
          masterProfile={masterProfile}
          selectedProfile={selectedProfile}
          selectedVersion={selectedVersion ?? versions[0] ?? null}
          onUpdateProfileLatex={handleUpdateProfileLatex}
        />
      )}

      {showImport && (
        <ResumeImportDialog
          onClose={() => setShowImport(false)}
          onImportComplete={handleImportComplete}
        />
      )}
    </div>
  );
}
