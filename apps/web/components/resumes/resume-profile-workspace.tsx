"use client";

import type {
  CreateResumeVersionInput,
  MasterCareerProfile,
  ResumeProfile,
  ResumeProfileInput,
  ResumeVersion,
} from "@repo/types";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  History,
  Layers,
  Loader2,
  Plus,
  Save,
  Sliders,
} from "lucide-react";
import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";

import { ResumePreview } from "../resume-intelligence/resume-preview";

interface ResumeProfileWorkspaceProps {
  profileId: string;
}

export function ResumeProfileWorkspace({ profileId }: ResumeProfileWorkspaceProps) {
  const [profile, setProfile] = useState<ResumeProfile | null>(null);
  const [masterProfile, setMasterProfile] = useState<MasterCareerProfile | null>(null);
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"preview" | "evidence" | "versions" | "settings">("preview");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Version snapshot creation modal
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [targetCompany, setTargetCompany] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);

  // Editable settings
  const [name, setName] = useState("");
  const [roleFocus, setRoleFocus] = useState("");
  const [summaryGuidance, setSummaryGuidance] = useState("");
  const [latexSource, setLatexSource] = useState("");

  // Priority evidence selections
  const [priorityProjectIds, setPriorityProjectIds] = useState<string[]>([]);
  const [prioritySkillIds, setPrioritySkillIds] = useState<string[]>([]);
  const [priorityExperienceIds, setPriorityExperienceIds] = useState<string[]>([]);

  const loadProfileData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profRes, masterRes, versRes] = await Promise.all([
        fetch(`/api/resume-profiles/${profileId}`, { cache: "no-store" }),
        fetch("/api/career-profile", { cache: "no-store" }),
        fetch(`/api/resume-profiles/${profileId}/versions`, { cache: "no-store" }),
      ]);

      if (!profRes.ok) {
        throw new Error("Resume profile not found.");
      }

      const profData = (await profRes.json()) as ResumeProfile;
      setProfile(profData);
      setName(profData.name);
      setRoleFocus(profData.roleFocus ?? "");
      setSummaryGuidance(profData.summaryGuidance ?? "");
      setLatexSource(profData.latexSource ?? "");
      setPriorityProjectIds(profData.priorityProjectIds);
      setPrioritySkillIds(profData.prioritySkillIds);
      setPriorityExperienceIds(profData.priorityExperienceIds);

      if (masterRes.ok) {
        const masterData = (await masterRes.json()) as MasterCareerProfile;
        setMasterProfile(masterData);
      }

      if (versRes.ok) {
        const versData = (await versRes.json()) as ResumeVersion[];
        setVersions(versData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    void loadProfileData();
  }, [loadProfileData]);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      const updatedInput: ResumeProfileInput = {
        name,
        roleFocus: roleFocus || undefined,
        summaryGuidance: summaryGuidance || undefined,
        latexSource: latexSource || undefined,
        visibleSections: profile.visibleSections,
        sectionOrder: profile.sectionOrder,
        priorityProjectIds,
        prioritySkillIds,
        priorityExperienceIds,
      };

      const res = await fetch(`/api/resume-profiles/${profile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedInput),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? "Failed to save profile.");
      }

      const updated = (await res.json()) as ResumeProfile;
      setProfile(updated);
      setActionSuccess("Profile configuration saved.");
      setTimeout(() => setActionSuccess(null), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setCreatingSnapshot(true);
    setError(null);
    try {
      const input: CreateResumeVersionInput = {
        targetCompany: targetCompany.trim().length > 0 ? targetCompany.trim() : undefined,
        targetRole:
          targetRole.trim().length > 0
            ? targetRole.trim()
            : (profile.roleFocus ?? undefined),
        outputFormat: "latex",
      };

      const res = await fetch(`/api/resume-profiles/${profile.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? "Failed to create version snapshot.");
      }

      const newVersion = (await res.json()) as ResumeVersion;
      setVersions([newVersion, ...versions]);
      setShowSnapshotModal(false);
      setTargetCompany("");
      setTargetRole("");
      setActionSuccess("New persistent version snapshot created!");
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create snapshot.");
    } finally {
      setCreatingSnapshot(false);
    }
  };

  const togglePrioritySkill = (id: string) => {
    setPrioritySkillIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const togglePriorityProject = (id: string) => {
    setPriorityProjectIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const togglePriorityExperience = (id: string) => {
    setPriorityExperienceIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        <span className="text-xs">Loading resume workspace...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto rounded-2xl border border-white/[0.08] bg-[#0b0f19] p-8 text-center space-y-4">
        <h2 className="text-lg font-bold text-white">Profile Not Found</h2>
        <p className="text-xs text-slate-400">The requested resume profile does not exist.</p>
        <Link
          href="/resumes"
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Resume Studio
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#0b0f19] p-6 backdrop-blur-md">
        <div className="space-y-1">
          <Link
            href="/resumes"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-white transition-colors mb-1"
          >
            <ArrowLeft className="w-3 h-3" /> Back to All Profiles
          </Link>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-white">{profile.name}</h1>
            <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-300">
              {profile.roleFocus ?? "General Profile"}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Persistent workspace asset · {String(versions.length)} immutable snapshots preserved
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleSaveProfile()}
            disabled={saving}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saving ? "Saving Changes..." : "Save Workspace"}
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <span>{error}</span>
        </div>
      )}

      {/* Quick Snapshot Trigger Form */}
      <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0f172a]/60 backdrop-blur-sm">
        <form onSubmit={(e) => void handleCreateSnapshot(e)} className="flex flex-col sm:flex-row items-end gap-3 text-xs">
          <div className="flex-1 w-full space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Snapshot Target Role
            </label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Senior Backend Engineer"
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex-1 w-full space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Target Company
            </label>
            <input
              type="text"
              value={targetCompany}
              onChange={(e) => setTargetCompany(e.target.value)}
              placeholder="e.g. Vercel, Stripe"
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={creatingSnapshot}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all disabled:opacity-50 shrink-0"
          >
            {creatingSnapshot ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            <span>Freeze Version</span>
          </button>
        </form>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.08] gap-1 text-xs">
        {[
          { id: "preview", label: "Live Typeset Preview", icon: Eye },
          { id: "evidence", label: "Evidence Prioritization", icon: Layers },
          { id: "versions", label: `Version History (${String(versions.length)})`, icon: History },
          { id: "settings", label: "Profile Settings", icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 font-medium border-b-2 transition-all ${
                isActive
                  ? "border-indigo-500 text-white font-semibold bg-white/[0.02]"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-indigo-400" : ""}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: PREVIEW */}
      {activeTab === "preview" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0b0f19] p-6 backdrop-blur-sm">
          <ResumePreview
            masterProfile={masterProfile}
            selectedProfile={profile}
            onUpdateProfileLatex={async (newSource) => {
              setLatexSource(newSource);
              await fetch(`/api/resume-profiles/${profile.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...profile, latexSource: newSource }),
              });
            }}
          />
        </div>
      )}

      {/* TAB CONTENT: EVIDENCE PRIORITIZATION */}
      {activeTab === "evidence" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0b0f19] p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Evidence Prioritization</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose which verified records from your Master Career Profile should be highlighted prominently on this resume track.
            </p>
          </div>

          {/* Priority Skills */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Priority Skills ({prioritySkillIds.length} selected)
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {masterProfile?.skills.map((skill) => {
                const isSelected = prioritySkillIds.includes(skill.id);
                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => togglePrioritySkill(skill.id)}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-all ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-600/30 text-white font-semibold"
                        : "border-white/10 bg-slate-900 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {isSelected ? `✓ ${skill.name}` : skill.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority Projects */}
          <div className="space-y-2 pt-2 border-t border-white/[0.06]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-purple-400">
              Priority Projects ({priorityProjectIds.length} selected)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {masterProfile?.projects.map((proj) => {
                const isSelected = priorityProjectIds.includes(proj.id);
                return (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => togglePriorityProject(proj.id)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? "border-purple-500 bg-purple-600/20 text-white"
                        : "border-white/10 bg-slate-900/50 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div className="font-semibold text-slate-200">{proj.name}</div>
                    {proj.description && (
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{proj.description}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority Experience */}
          <div className="space-y-2 pt-2 border-t border-white/[0.06]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
              Priority Experience Roles ({priorityExperienceIds.length} selected)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {masterProfile?.experiences.map((exp) => {
                const isSelected = priorityExperienceIds.includes(exp.id);
                return (
                  <button
                    key={exp.id}
                    type="button"
                    onClick={() => togglePriorityExperience(exp.id)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? "border-cyan-500 bg-cyan-600/20 text-white"
                        : "border-white/10 bg-slate-900/50 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div className="font-semibold text-slate-200">{exp.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{exp.company}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.08] flex justify-end">
            <button
              type="button"
              onClick={() => void handleSaveProfile()}
              disabled={saving}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-semibold text-white shadow-md transition-colors"
            >
              Save Evidence Selections
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT: VERSIONS */}
      {activeTab === "versions" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0b0f19] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Version Archive</h2>
              <p className="text-xs text-slate-400">
                Immutable, persistent snapshots derived from this profile.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSnapshotModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              <Plus className="w-3.5 h-3.5" /> Snapshot Version
            </button>
          </div>

          {versions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-slate-400 space-y-2">
              <p>No snapshots generated for this profile yet.</p>
              <button
                type="button"
                onClick={() => setShowSnapshotModal(true)}
                className="text-indigo-400 hover:underline"
              >
                Create your first version snapshot
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">
                        {v.targetCompany
                          ? `${v.targetCompany} (${v.targetRole ?? "Targeted"})`
                          : "General Version"}
                      </span>
                      <span className="rounded border border-indigo-500/20 bg-indigo-500/10 px-1.5 py-0.5 text-[9px] uppercase font-bold text-indigo-400">
                        {v.outputFormat}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{new Date(v.createdAt).toLocaleString()}</span>
                      {v.confidence != null && (
                        <span>· Confidence: {Math.round(v.confidence * 100)}%</span>
                      )}
                    </div>
                  </div>

                  <Link
                    href={`/resumes/${profile.id}/versions/${v.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Snapshot</span>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: SETTINGS */}
      {activeTab === "settings" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0b0f19] p-6 space-y-4 max-w-2xl text-xs">
          <div className="space-y-1">
            <label className="text-slate-300 font-medium">Profile Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-medium">Role Focus / Title</label>
            <input
              type="text"
              value={roleFocus}
              onChange={(e) => setRoleFocus(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-medium">Summary Guidance</label>
            <textarea
              value={summaryGuidance}
              onChange={(e) => setSummaryGuidance(e.target.value)}
              className="w-full h-24 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          <div className="pt-3 border-t border-white/[0.08] flex justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSaveProfile()}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-semibold text-white shadow-md transition-colors"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      )}

      {/* Snapshot Modal */}
      {showSnapshotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0b0f19] p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Create Version Snapshot</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Snapshots freeze your current master profile evidence and settings into an immutable version asset.
            </p>

            <form onSubmit={(e) => void handleCreateSnapshot(e)} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Target Company (Optional)</label>
                <input
                  type="text"
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  placeholder="e.g. Stripe / Anthropic / Google"
                  className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Target Role Title (Optional)</label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Senior Distributed Systems Engineer"
                  className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSnapshotModal(false)}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSnapshot}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-xs font-semibold text-white shadow-md"
                >
                  {creatingSnapshot ? "Saving..." : "Create Snapshot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
