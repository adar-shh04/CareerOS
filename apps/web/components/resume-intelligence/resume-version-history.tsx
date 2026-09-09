"use client";

import type {
  CreateResumeVersionInput,
  ResumeOutputFormat,
  ResumeProfile,
  ResumeVersion,
} from "@repo/types";
import {
  Clock,
  Code,
  FileCode,
  FileDown,
  FileText,
  History,
  Sparkles,
  X,
} from "lucide-react";
import React, { useState } from "react";

interface Props {
  selectedProfile: ResumeProfile | null;
  versions: ResumeVersion[];
  onCreateVersion: (input: CreateResumeVersionInput) => Promise<void>;
  loading: boolean;
}

export function ResumeVersionHistory({
  selectedProfile,
  versions,
  onCreateVersion,
  loading,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [targetCompany, setTargetCompany] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [outputFormat, setOutputFormat] = useState<ResumeOutputFormat>("html");
  const [submitting, setSubmitting] = useState(false);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProfile) return;

    setSubmitting(true);
    try {
      await onCreateVersion({
        targetCompany,
        targetRole,
        outputFormat,
        templateVersion: "v1.0.0",
        confidence: 0.92,
        explanation: `Tailored snapshot generated from Master Career Profile for ${targetCompany || "general applications"}.`,
      });
      setTargetCompany("");
      setTargetRole("");
      setShowModal(false);
    } catch {
      /* handled in parent */
    } finally {
      setSubmitting(false);
    }
  }

  if (!selectedProfile) {
    return (
      <div className="p-12 text-center rounded-xl border border-dashed border-slate-200 bg-white shadow-xs">
        <History className="w-9 h-9 text-[#1d68ed] mx-auto mb-3" />
        <h4 className="text-sm font-bold text-slate-900">Select a Resume Profile</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Please select a profile from the &quot;Resume Profiles&quot; tab to view or create version snapshots.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 rounded-xl border border-slate-200/80 bg-white shadow-xs gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Immutable Resume Versions
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Active Profile: <strong className="text-[#1d68ed]">{selectedProfile.name}</strong> • Provenance snapshots for job applications.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          Generate New Version Snapshot
        </button>
      </div>

      {/* Version List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          Loading version history...
        </div>
      ) : versions.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-slate-200 bg-white shadow-xs flex flex-col items-center gap-3">
          <History className="w-9 h-9 text-[#1d68ed]" />
          <div>
            <h4 className="text-sm font-bold text-slate-900">No Version Snapshots Created</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Generate an immutable resume snapshot for a specific application to lock in record provenance.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            + Generate First Snapshot
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {versions.map((ver) => (
            <div
              key={ver.id}
              className="p-4 sm:p-5 rounded-xl border border-slate-200/80 bg-white shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <FormatBadge format={ver.outputFormat} />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-slate-900">
                      {ver.targetCompany ? `${ver.targetCompany} — ` : ""}{ver.targetRole ?? "General Application"}
                    </h4>
                    {ver.confidence && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        {Math.round(ver.confidence * 100)}% Fit Score
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {ver.explanation ?? `Generated snapshot template ${ver.templateVersion ?? "v1.0"}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-auto">
                <div className="text-right text-xs text-slate-400">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {new Date(ver.createdAt).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400">ID: {ver.id.slice(0, 8)}...</div>
                </div>

                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-medium shadow-2xs transition-colors cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Export {ver.outputFormat.toUpperCase()}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate Version Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">Generate Resume Snapshot</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={(e) => void handleGenerate(e)} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-900 font-semibold block">Target Company</label>
                <input
                  type="text"
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  placeholder="e.g. Anthropic, Scale AI, Vercel"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-[#1d68ed] focus:bg-white focus:ring-2 focus:ring-[#1d68ed]/20 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-900 font-semibold block">Target Role</label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Staff AI Platform Lead"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-[#1d68ed] focus:bg-white focus:ring-2 focus:ring-[#1d68ed]/20 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-900 font-semibold block">Output Format</label>
                <select
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value as ResumeOutputFormat)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-[#1d68ed] focus:bg-white focus:ring-2 focus:ring-[#1d68ed]/20 focus:outline-none"
                >
                  <option value="html">Interactive Web (HTML)</option>
                  <option value="latex">LaTeX Source Document (.tex)</option>
                  <option value="pdf">Compiled PDF Document (.pdf)</option>
                </select>
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
                  {submitting ? "Generating..." : "Create Snapshot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FormatBadge({ format }: { format: ResumeOutputFormat }) {
  const icon =
    format === "latex" ? (
      <FileCode className="w-4 h-4 text-purple-600" />
    ) : format === "pdf" ? (
      <FileText className="w-4 h-4 text-rose-600" />
    ) : (
      <Code className="w-4 h-4 text-[#1d68ed]" />
    );

  return (
    <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
      {icon}
    </div>
  );
}
