"use client";

import type { ResumeSection } from "@repo/types";
import {
  ArrowLeft,
  ArrowRight,
  FileCode,
  FileText,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

const ALL_SECTIONS: { id: ResumeSection; label: string }[] = [
  { id: "identity", label: "Identity & Contacts" },
  { id: "summary", label: "Professional Summary" },
  { id: "experience", label: "Work Experience" },
  { id: "skills", label: "Technical Skills" },
  { id: "projects", label: "Key Projects" },
  { id: "education", label: "Education" },
  { id: "certifications", label: "Certifications" },
  { id: "achievements", label: "Achievements & Awards" },
  { id: "links", label: "Portfolio & Social Links" },
];

export function CreateResumeProfileForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"standard" | "latex">("standard");
  const [name, setName] = useState("");
  const [roleFocus, setRoleFocus] = useState("");
  const [summaryGuidance, setSummaryGuidance] = useState("");
  const [latexCode, setLatexCode] = useState("");
  const [visibleSections, setVisibleSections] = useState<ResumeSection[]>([
    "identity",
    "summary",
    "experience",
    "skills",
    "projects",
    "education",
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSection = (id: ResumeSection) => {
    if (visibleSections.includes(id)) {
      if (visibleSections.length <= 1) return; // Keep at least 1 section
      setVisibleSections(visibleSections.filter((s) => s !== id));
    } else {
      setVisibleSections([...visibleSections, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a name for this resume profile.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (mode === "latex") {
        if (!latexCode.trim()) {
          throw new Error("Please provide LaTeX source code.");
        }
        const res = await fetch("/api/resume-profiles/import-latex", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), latexCode }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            message?: string;
          };
          throw new Error(body.message ?? "Failed to import LaTeX resume.");
        }
        const data = (await res.json()) as { profile: { id: string } };
        router.push(`/resumes/${data.profile.id}`);
      } else {
        const res = await fetch("/api/resume-profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            roleFocus: roleFocus.trim() || undefined,
            summaryGuidance: summaryGuidance.trim() || undefined,
            visibleSections,
            sectionOrder: visibleSections,
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            message?: string;
          };
          throw new Error(body.message ?? "Failed to create resume profile.");
        }
        const created = (await res.json()) as { id: string };
        router.push(`/resumes/${created.id}`);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create profile.",
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/resumes"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Resume Studio
        </Link>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#0b0f19] p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Create Resume Profile
          </h1>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            Resume profiles establish dedicated role tracks (e.g. Backend vs Full Stack) with custom section visibility and formatting preferences, while drawing from your unified Master Career Profile.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode("standard")}
            className={`rounded-xl border p-4 text-left transition-all ${
              mode === "standard"
                ? "border-indigo-500 bg-indigo-600/15 text-white"
                : "border-white/10 bg-slate-900/50 text-slate-400 hover:text-slate-200"
            }`}
          >
            <div className="flex items-center gap-2 font-semibold text-xs text-indigo-400 mb-1">
              <FileText className="w-4 h-4" /> Standard Profile
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Uses CareerOS canonical LaTeX typeset layout configured by section choices and master evidence.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMode("latex")}
            className={`rounded-xl border p-4 text-left transition-all ${
              mode === "latex"
                ? "border-purple-500 bg-purple-600/15 text-white"
                : "border-white/10 bg-slate-900/50 text-slate-400 hover:text-slate-200"
            }`}
          >
            <div className="flex items-center gap-2 font-semibold text-xs text-purple-400 mb-1">
              <FileCode className="w-4 h-4" /> Custom LaTeX Code
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Import an existing LaTeX document (Overleaf, custom preamble) and maintain 100% fidelity.
            </p>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-slate-300 font-medium">
              Profile Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Senior Distributed Systems Engineer"
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-medium">Role Focus / Headline</label>
            <input
              type="text"
              value={roleFocus}
              onChange={(e) => setRoleFocus(e.target.value)}
              placeholder="e.g. Infrastructure, Go, Kubernetes, High-Throughput APIs"
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-medium">
              Summary Guidance (Optional)
            </label>
            <textarea
              value={summaryGuidance}
              onChange={(e) => setSummaryGuidance(e.target.value)}
              placeholder="Guiding themes or narrative priorities for this resume track..."
              className="w-full h-20 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {mode === "standard" ? (
            <div className="space-y-2 pt-2">
              <label className="text-slate-300 font-medium block">
                Included Sections
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALL_SECTIONS.map((sec) => {
                  const isChecked = visibleSections.includes(sec.id);
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => toggleSection(sec.id)}
                      className={`flex items-center gap-2 rounded-lg border p-2.5 text-left transition-all ${
                        isChecked
                          ? "border-indigo-500 bg-indigo-600/20 text-white font-medium"
                          : "border-white/10 bg-slate-950/40 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="h-3.5 w-3.5 rounded border-white/20 bg-slate-900 text-indigo-600 focus:ring-0"
                      />
                      <span className="text-[11px]">{sec.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-1 pt-2">
              <label className="text-slate-300 font-medium">
                Raw LaTeX Source Code
              </label>
              <textarea
                required
                value={latexCode}
                onChange={(e) => setLatexCode(e.target.value)}
                placeholder="\documentclass{article}&#10;\begin{document}&#10;...&#10;\end{document}"
                className="w-full h-48 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none resize-none font-mono leading-relaxed"
              />
            </div>
          )}

          <div className="pt-4 border-t border-white/[0.08] flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-6 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  Create Profile Workspace <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
