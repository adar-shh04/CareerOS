"use client";

import type {
  CreateResumeVersionInput,
  MasterCareerProfile,
  MasterCareerProfileInput,
  ResumeProfile,
  ResumeProfileInput,
  ResumeVersion,
} from "@repo/types";
import { Diff, Eye, FileText, History, Layers, Upload,UserCheck } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

import { MasterProfileEditor } from "./master-profile-editor";
import { ResumeImportDialog } from "./resume-import-dialog";
import { ResumeOverviewCards } from "./resume-overview-cards";
import { ResumePreview } from "./resume-preview";
import { ResumeProfilesManager } from "./resume-profiles-manager";
import { ResumeVersionComparison } from "./resume-version-comparison";
import { ResumeVersionHistory } from "./resume-version-history";

interface ResumeIntelligenceViewProps {
  initialVersion?: ResumeVersion | null;
  initialProfile?: ResumeProfile | null;
}

export function ResumeIntelligenceView({ initialVersion, initialProfile }: ResumeIntelligenceViewProps = {}) {
  const [subTab, setSubTab] = useState<
    "master" | "profiles" | "versions" | "preview" | "compare"
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

  const selectedProfile =
    profiles.find((p) => p.id === selectedProfileId) ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Module Header Navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: "0.5rem",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              backgroundColor: "rgba(168, 85, 247, 0.15)",
              border: "1px solid rgba(168, 85, 247, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FileText style={{ width: "20px", height: "20px", color: "#c084fc" }} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", letterSpacing: "-0.02em" }}>
              Resume Intelligence
            </h2>
            <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
              Master profile source of truth, targeted resume variants, and immutable version snapshots.
            </span>
          </div>
        </div>

        {/* Sub Navigation Pills */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setShowImport(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.5rem 0.9rem",
              borderRadius: "0.5rem",
              fontSize: "0.85rem",
              fontWeight: "600",
              color: "#ffffff",
              background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
              border: "none",
              cursor: "pointer",
              marginRight: "0.5rem",
            }}
          >
            <Upload style={{ width: "14px", height: "14px" }} />
            Import Resume
          </button>
          {[
            { id: "master", label: "Master Career Profile", icon: UserCheck },
            { id: "profiles", label: `Resume Profiles (${String(profiles.length)})`, icon: Layers },
            { id: "versions", label: `Version History (${String(versions.length)})`, icon: History },
            { id: "preview", label: "Resume Studio Preview", icon: Eye },
            { id: "compare", label: "Version Diff", icon: Diff },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id as typeof subTab)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.5rem 0.9rem",
                  borderRadius: "0.5rem",
                  fontSize: "0.85rem",
                  fontWeight: isActive ? "600" : "500",
                  color: isActive ? "#ffffff" : "#94a3b8",
                  backgroundColor: isActive ? "rgba(99, 102, 241, 0.15)" : "rgba(15, 23, 42, 0.4)",
                  border: isActive ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid rgba(255,255,255,0.06)",
                  cursor: "pointer",
                }}
              >
                <Icon style={{ width: "14px", height: "14px", color: isActive ? "#818cf8" : "#64748b" }} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          style={{
            padding: "0.875rem 1.25rem",
            borderRadius: "0.5rem",
            backgroundColor: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#fca5a5",
            fontSize: "0.875rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{error.message}</span>
          <button
            type="button"
            onClick={() => {
              void loadMasterProfile();
              void loadProfiles();
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "#ffffff",
              textDecoration: "underline",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
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
        />
      )}

      {subTab === "compare" && (
        <ResumeVersionComparison versions={versions} />
      )}

      {showImport && (
        <ResumeImportDialog
          onClose={() => setShowImport(false)}
          onImportComplete={handleSaveMaster}
        />
      )}
    </div>
  );
}
