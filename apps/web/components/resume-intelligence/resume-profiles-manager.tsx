"use client";

import type { ResumeProfile, ResumeProfileInput } from "@repo/types";
import { Check, FileText, Layers, Plus, X } from "lucide-react";
import React, { useState } from "react";

interface Props {
  profiles: ResumeProfile[];
  selectedProfileId: string | null;
  onSelectProfile: (id: string) => void;
  onCreateProfile: (input: ResumeProfileInput) => Promise<void>;
  loading: boolean;
}

export function ResumeProfilesManager({
  profiles,
  selectedProfileId,
  onSelectProfile,
  onCreateProfile,
  loading,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [roleFocus, setRoleFocus] = useState("");
  const [summaryGuidance, setSummaryGuidance] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      await onCreateProfile({
        name,
        roleFocus,
        summaryGuidance,
        visibleSections: [
          "identity",
          "summary",
          "experience",
          "skills",
          "education",
          "projects",
        ],
        sectionOrder: [
          "identity",
          "summary",
          "experience",
          "skills",
          "education",
          "projects",
        ],
      });
      setName("");
      setRoleFocus("");
      setSummaryGuidance("");
      setShowModal(false);
    } catch {
      /* handled in parent */
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 rounded-xl border border-slate-200/80 bg-white shadow-xs gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Targeted Resume Profiles
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Tailor section ordering, highlight emphasis, and summary messaging for specific target roles.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Resume Profile
        </button>
      </div>

      {/* Profiles Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          Loading profiles...
        </div>
      ) : profiles.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-slate-200 bg-white shadow-xs flex flex-col items-center gap-3">
          <FileText className="w-9 h-9 text-[#1d68ed]" />
          <div>
            <h4 className="text-sm font-bold text-slate-900">No Resume Profiles Yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Create your first named resume profile to generate tailored resume versions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            + Create First Profile
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((prof) => {
            const isSelected = selectedProfileId === prof.id;
            return (
              <div
                key={prof.id}
                onClick={() => onSelectProfile(prof.id)}
                className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-xs ${
                  isSelected
                    ? "border-blue-300 bg-blue-50/50"
                    : "border-slate-200/80 bg-white hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-1.5">
                    <h4 className="text-sm font-bold text-slate-900">
                      {prof.name}
                    </h4>
                    {isSelected && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Check className="w-3 h-3 text-emerald-600" /> Selected
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#1d68ed] font-semibold mb-1.5">
                    Focus: {prof.roleFocus ?? "General Software Engineering"}
                  </div>
                  {prof.summaryGuidance && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      &quot;{prof.summaryGuidance}&quot;
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    {prof.visibleSections.length} Active Sections
                  </span>
                  <span>
                    Updated {new Date(prof.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Profile Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">Create Named Resume Profile</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={(e) => void handleCreate(e)} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-900 font-semibold block">Profile Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Staff AI Systems Engineer"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-[#1d68ed] focus:bg-white focus:ring-2 focus:ring-[#1d68ed]/20 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-900 font-semibold block">Role Focus / Target Keywords</label>
                <input
                  type="text"
                  value={roleFocus}
                  onChange={(e) => setRoleFocus(e.target.value)}
                  placeholder="e.g. LLM Infrastructure, Distributed Systems, Node.js"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-[#1d68ed] focus:bg-white focus:ring-2 focus:ring-[#1d68ed]/20 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-900 font-semibold block">Summary Guidance</label>
                <textarea
                  value={summaryGuidance}
                  onChange={(e) => setSummaryGuidance(e.target.value)}
                  placeholder="Emphasize distributed consensus, high-throughput pipelines, and AI platform architecture..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-[#1d68ed] focus:bg-white focus:ring-2 focus:ring-[#1d68ed]/20 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Save Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
