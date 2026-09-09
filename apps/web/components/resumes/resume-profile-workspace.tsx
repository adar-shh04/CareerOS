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
        <Loader2 className="h-6 w-6 animate-spin text-[#1d68ed]" />
        <span className="text-xs font-medium">Loading resume workspace...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto rounded-xl border border-slate-200/80 bg-white p-8 text-center space-y-4 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900">Profile Not Found</h2>
        <p className="text-xs text-slate-500">The requested resume profile does not exist.</p>
        <Link
          href="/resumes"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Resume Studio
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="space-y-1">
          <Link
            href="/resumes"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-900 transition-colors mb-1"
          >
            <ArrowLeft className="w-3 h-3" /> Back to All Profiles
          </Link>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">{profile.name}</h1>
            <span className="rounded-full border border-blue-200/80 bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-[#1d68ed]">
              {profile.roleFocus ?? "General Profile"}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Persistent workspace asset · {String(versions.length)} immutable snapshots preserved
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleSaveProfile()}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
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
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 shadow-2xs">
          <span>{error}</span>
        </div>
      )}

      {/* Quick Snapshot Trigger Form */}
      <div className="p-5 rounded-xl border border-slate-200/80 bg-white shadow-xs">
        <form onSubmit={(e) => void handleCreateSnapshot(e)} className="flex flex-col sm:flex-row items-end gap-3 text-xs">
          <div className="flex-1 w-full space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Snapshot Target Role
            </label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Senior Backend Engineer"
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1d68ed] focus:ring-2 focus:ring-[#1d68ed]/20"
            />
          </div>

          <div className="flex-1 w-full space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Target Company
            </label>
            <input
              type="text"
              value={targetCompany}
              onChange={(e) => setTargetCompany(e.target.value)}
              placeholder="e.g. Vercel, Stripe"
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1d68ed] focus:ring-2 focus:ring-[#1d68ed]/20"
            />
          </div>

          <button
            type="submit"
            disabled={creatingSnapshot}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all disabled:opacity-50 shrink-0 shadow-xs cursor-pointer"
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
      <div className="flex border-b border-slate-200 gap-1 text-xs">
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
              className={`flex items-center gap-2 px-4 py-2.5 font-medium border-b-2 transition-all cursor-pointer ${
                isActive
                  ? "border-[#1d68ed] text-[#1d68ed] font-bold bg-blue-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#1d68ed]" : ""}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: PREVIEW */}
      {activeTab === "preview" && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs">
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
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 space-y-6 shadow-xs">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Evidence Prioritization</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose which verified records from your Master Career Profile should be highlighted prominently on this resume track.
            </p>
          </div>

          {/* Priority Skills */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1d68ed]">
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
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? "border-blue-300 bg-blue-50/80 text-[#1d68ed] font-bold shadow-2xs"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-white"
                    }`}
                  >
                    {isSelected ? `✓ ${skill.name}` : skill.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority Projects */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700">
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
                    className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-purple-300 bg-purple-50/70 text-slate-900 shadow-2xs"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-white"
                    }`}
                  >
                    <div className="font-semibold text-slate-900">{proj.name}</div>
                    {proj.description && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{proj.description}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority Experience */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700">
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
                    className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-emerald-300 bg-emerald-50/70 text-slate-900 shadow-2xs"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-white"
                    }`}
                  >
                    <div className="font-semibold text-slate-900">{exp.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{exp.company}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => void handleSaveProfile()}
              disabled={saving}
              className="rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] px-5 py-2 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
            >
              Save Evidence Selections
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT: VERSIONS */}
      {activeTab === "versions" && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Version Archive</h2>
              <p className="text-xs text-slate-500">
                Immutable, persistent snapshots derived from this profile.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSnapshotModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Snapshot Version
            </button>
          </div>

          {versions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500 space-y-2">
              <p>No snapshots generated for this profile yet.</p>
              <button
                type="button"
                onClick={() => setShowSnapshotModal(true)}
                className="text-[#1d68ed] hover:underline font-semibold cursor-pointer"
              >
                Create your first version snapshot
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/70 px-2 rounded-lg transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {v.targetCompany
                          ? `${v.targetCompany} (${v.targetRole ?? "Targeted"})`
                          : "General Version"}
                      </span>
                      <span className="rounded border border-blue-200/80 bg-blue-50 px-1.5 py-0.5 text-[9px] uppercase font-bold text-[#1d68ed]">
                        {v.outputFormat}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{new Date(v.createdAt).toLocaleString()}</span>
                      {v.confidence != null && (
                        <span>· Confidence: {Math.round(v.confidence * 100)}%</span>
                      )}
                    </div>
                  </div>

                  <Link
                    href={`/resumes/${profile.id}/versions/${v.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
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
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 space-y-4 max-w-2xl text-xs shadow-xs">
          <div className="space-y-1">
            <label className="text-slate-900 font-semibold">Profile Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 text-xs focus:border-[#1d68ed] focus:bg-white focus:ring-2 focus:ring-[#1d68ed]/20 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-900 font-semibold">Role Focus / Title</label>
            <input
              type="text"
              value={roleFocus}
              onChange={(e) => setRoleFocus(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 text-xs focus:border-[#1d68ed] focus:bg-white focus:ring-2 focus:ring-[#1d68ed]/20 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-900 font-semibold">Summary Guidance</label>
            <textarea
              value={summaryGuidance}
              onChange={(e) => setSummaryGuidance(e.target.value)}
              className="w-full h-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 text-xs focus:border-[#1d68ed] focus:bg-white focus:ring-2 focus:ring-[#1d68ed]/20 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSaveProfile()}
              className="rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] px-5 py-2 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      )}

      {/* Snapshot Modal */}
      {showSnapshotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Create Version Snapshot</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Snapshots freeze your current master profile evidence and settings into an immutable version asset.
            </p>

            <form onSubmit={(e) => void handleCreateSnapshot(e)} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-900 font-semibold">Target Company (Optional)</label>
                <input
                  type="text"
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  placeholder="e.g. Stripe / Anthropic / Google"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 text-xs focus:border-[#1d68ed] focus:bg-white focus:ring-2 focus:ring-[#1d68ed]/20 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-900 font-semibold">Target Role Title (Optional)</label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Senior Distributed Systems Engineer"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 text-xs focus:border-[#1d68ed] focus:bg-white focus:ring-2 focus:ring-[#1d68ed]/20 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSnapshotModal(false)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSnapshot}
                  className="rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] px-4 py-1.5 text-xs font-semibold text-white shadow-xs cursor-pointer"
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
