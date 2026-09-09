"use client";

import type {
  MasterCareerProfile,
  ResumeProfile,
  ResumeVersion,
} from "@repo/types";
import {
  Check,
  Code2,
  Copy,
  Eye,
  FileCode,
  Loader2,
  Maximize2,
  Printer,
  RefreshCw,
  Save,
  User,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  compileLatexToHtml,
  generateLatexFromProfile,
} from "@/lib/latex-engine";

interface ResumePreviewProps {
  masterProfile: MasterCareerProfile | null;
  selectedProfile?: ResumeProfile | null;
  selectedVersion?: ResumeVersion | null;
  onUpdateProfileLatex?: (latexSource: string) => Promise<void>;
}

export function ResumePreview({
  masterProfile,
  selectedProfile,
  selectedVersion,
  onUpdateProfileLatex,
}: ResumePreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<"rendered" | "code" | "split">(
    "rendered",
  );
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Derive initial LaTeX: user's profile latexSource > generate from master profile
  const profileData = selectedVersion?.masterProfileSnapshot ?? masterProfile;

  const generatedLatex = useMemo(() => {
    if (!profileData?.identity.fullName) return "";
    return generateLatexFromProfile(profileData, selectedProfile);
  }, [profileData, selectedProfile]);

  const [latexSource, setLatexSource] = useState<string>("");

  useEffect(() => {
    if (selectedProfile?.latexSource) {
      setLatexSource(selectedProfile.latexSource);
    } else if (generatedLatex) {
      setLatexSource(generatedLatex);
    }
  }, [selectedProfile?.latexSource, generatedLatex]);

  // Compile LaTeX into typeset HTML preview
  const compiled = useMemo(() => {
    return compileLatexToHtml(latexSource);
  }, [latexSource]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(latexSource);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleResetToCanonical = () => {
    if (generatedLatex) {
      setLatexSource(generatedLatex);
    }
  };

  const handleSaveLatex = async () => {
    if (!selectedProfile?.id) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      if (onUpdateProfileLatex) {
        await onUpdateProfileLatex(latexSource);
      } else {
        // Direct save via API
        const response = await fetch(
          `/api/resume-profiles/${selectedProfile.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...selectedProfile,
              latexSource,
            }),
          },
        );
        if (!response.ok) {
          throw new Error("Failed to save LaTeX source to profile.");
        }
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!profileData?.identity.fullName && !selectedProfile?.latexSource) {
    return (
      <div className="p-12 text-center rounded-xl border border-slate-200/80 bg-white shadow-xs">
        <User className="w-12 h-12 text-[#1d68ed] mx-auto mb-3" />
        <h4 className="text-lg font-bold text-slate-900">
          No Resume Data Available
        </h4>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Please complete your Master Career Profile or import a LaTeX resume to
          generate a live rendered preview.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Control / Toolbar Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border border-slate-200/80 bg-white shadow-xs gap-3 print:hidden">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <FileCode className="w-5 h-5 text-[#1d68ed]" />
            <h3 className="font-bold text-slate-900 text-base">
              Resume Studio — LaTeX Pipeline
            </h3>
            {selectedProfile && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#1d68ed] border border-blue-200/80">
                Profile: {selectedProfile.name}
              </span>
            )}
            {selectedProfile?.latexSource ? (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                User Template Preserved
              </span>
            ) : (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                CareerOS Canonical LaTeX
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Compiled LaTeX output with Computer Modern typography. Edit LaTeX
            source or preview rendered document live.
          </p>
        </div>

        {/* View toggles & actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode("rendered")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "rendered"
                  ? "bg-white text-[#1d68ed] shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Rendered
            </button>
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "split"
                  ? "bg-white text-[#1d68ed] shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Split View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("code")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "code"
                  ? "bg-white text-[#1d68ed] shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              LaTeX Code
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              void handleCopyCode();
            }}
            title="Copy LaTeX source"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-medium border border-slate-200 shadow-2xs transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                Copy .tex
              </>
            )}
          </button>

          {selectedProfile && (
            <button
              type="button"
              onClick={() => {
                void handleSaveLatex();
              }}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : saveSuccess ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saveSuccess ? "Saved!" : "Save to Profile"}
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / PDF
          </button>
        </div>
      </div>

      {/* Main Workspace: Rendered and/or Code */}
      <div
        className={`w-full grid gap-4 ${
          viewMode === "split"
            ? "grid-cols-1 lg:grid-cols-2"
            : "grid-cols-1"
        }`}
      >
        {/* Code Editor Panel */}
        {(viewMode === "code" || viewMode === "split") && (
          <div className="flex flex-col rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-xs print:hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span className="font-mono text-slate-900 font-semibold">
                  resume.tex
                </span>
                <span className="text-[11px] text-slate-500">
                  ({latexSource.length} chars)
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetToCanonical}
                className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-[#1d68ed] transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Reset to Canonical Template
              </button>
            </div>
            <textarea
              value={latexSource}
              onChange={(e) => setLatexSource(e.target.value)}
              spellCheck={false}
              className="w-full h-[650px] lg:h-[900px] p-4 bg-white text-slate-900 font-mono text-xs leading-relaxed resize-none outline-none border-none selection:bg-blue-100"
              placeholder="% Paste or edit your LaTeX resume code here..."
            />
          </div>
        )}

        {/* Rendered Document Sheet */}
        {(viewMode === "rendered" || viewMode === "split") && (
          <div className="w-full flex justify-center bg-slate-100/70 p-4 sm:p-8 rounded-xl border border-slate-200/80 shadow-inner overflow-x-auto print:bg-white print:p-0 print:border-none">
            <div
              ref={printRef}
              className="w-full max-w-[800px] print:w-full print:max-w-none print:m-0"
              dangerouslySetInnerHTML={{ __html: compiled.html }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
