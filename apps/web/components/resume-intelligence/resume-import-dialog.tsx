"use client";

import type { MasterCareerProfileInput } from "@repo/types";
import {
  Check,
  FileCode,
  Loader2,
  ShieldAlert,
  Sparkles,
  Upload,
  UploadCloud,
  X,
} from "lucide-react";
import React, { useRef, useState } from "react";

interface ResumeImportDialogProps {
  onClose: () => void;
  onImportComplete: (
    data: MasterCareerProfileInput,
    latexSource?: string,
  ) => Promise<void>;
}

export function ResumeImportDialog({
  onClose,
  onImportComplete,
}: ResumeImportDialogProps) {
  const [inputMode, setInputMode] = useState<"file" | "latex">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [latexText, setLatexText] = useState("");
  const [capturedLatex, setCapturedLatex] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stages: "input" | "review"
  const [stage, setStage] = useState<"input" | "review">("input");
  const [parsedData, setParsedData] =
    useState<MasterCareerProfileInput | null>(null);

  const validateAndSetFile = async (file: File) => {
    setError(null);
    const validExtensions = [".pdf", ".docx", ".txt", ".md", ".json", ".tex"];
    const hasValidExt = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext),
    );
    if (!hasValidExt) {
      setError(
        "Please select a supported file (.pdf, .docx, .txt, .md, .json, .tex).",
      );
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds the 10MB limit.");
      return;
    }
    setSelectedFile(file);

    if (file.name.toLowerCase().endsWith(".tex")) {
      try {
        const text = await file.text();
        setCapturedLatex(text);
      } catch {
        /* ignore */
      }
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      void validateAndSetFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void validateAndSetFile(file);
    }
  };

  const handleParse = async () => {
    if (inputMode === "file") {
      if (!selectedFile) {
        setError("Please choose or drop a resume file to upload.");
        return;
      }

      setParsing(true);
      setError(null);
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const response = await fetch("/api/resume-profiles/parse", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as {
            message?: string;
          };
          throw new Error(body.message ?? "File parsing failed.");
        }

        const data = (await response.json()) as MasterCareerProfileInput;
        setParsedData(data);
        setStage("review");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to parse resume file.",
        );
      } finally {
        setParsing(false);
      }
    } else {
      if (!latexText.trim()) {
        setError("Please provide your LaTeX resume source code.");
        return;
      }

      setParsing(true);
      setError(null);
      try {
        setCapturedLatex(latexText);
        const response = await fetch("/api/resume-profiles/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeText: latexText }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as {
            message?: string;
          };
          throw new Error(body.message ?? "Parsing failed.");
        }

        const data = (await response.json()) as MasterCareerProfileInput;
        setParsedData(data);
        setStage("review");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "An error occurred during parsing.",
        );
      } finally {
        setParsing(false);
      }
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedData) return;

    try {
      await onImportComplete(parsedData, capturedLatex ?? undefined);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to import profile data.",
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className={`w-full ${stage === "input" ? "max-w-xl" : "max-w-3xl"} max-h-[90vh] flex flex-col rounded-xl overflow-hidden bg-white border border-slate-200 shadow-2xl`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#1d68ed]" />
            <h3 className="text-base font-bold text-slate-900">
              {stage === "input"
                ? "Import Existing Resume"
                : "Review Extracted Career Profile"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 shadow-2xs">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {stage === "input" ? (
            <div className="flex flex-col gap-4">
              {/* Tab Selector */}
              <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setInputMode("file")}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    inputMode === "file"
                      ? "bg-white text-[#1d68ed] shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Upload Document
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("latex")}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    inputMode === "latex"
                      ? "bg-white text-[#1d68ed] shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  LaTeX Code
                </button>
              </div>

              {inputMode === "file" ? (
                <div className="flex flex-col gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.md,.json,.tex,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,application/json,application/x-tex,text/x-tex"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center gap-3 ${
                      isDragging
                        ? "border-[#1d68ed] bg-blue-50/50"
                        : "border-slate-300 bg-slate-50 hover:bg-white hover:border-slate-400"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1d68ed] border border-blue-200/80 flex items-center justify-center">
                      {selectedFile ? (
                        <FileCode className="w-6 h-6" />
                      ) : (
                        <UploadCloud className="w-6 h-6" />
                      )}
                    </div>

                    {selectedFile ? (
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {selectedFile.name}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {(selectedFile.size / 1024).toFixed(1)} KB • Click or
                          drop another file to replace
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          Click to upload or drag &amp; drop
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Supported formats: PDF, DOCX, TXT, LaTeX (.tex), Markdown, JSON (up to 10MB)
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Paste your raw LaTeX resume source code. CareerOS preserves your original LaTeX
                    template design and typography as the canonical source for your Resume Profile,
                    while extracting structured evidence for your Master Career Profile.
                  </p>

                  <textarea
                    value={latexText}
                    onChange={(e) => setLatexText(e.target.value)}
                    placeholder={String.raw`\documentclass[letterpaper,11pt]{article}
\usepackage{latexsym}
\begin{document}
\section{Experience}
Software Engineer at Example Corp
\end{document}`}
                    className="w-full h-60 rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-900 font-mono text-xs leading-relaxed focus:border-[#1d68ed] focus:bg-white focus:ring-2 focus:ring-[#1d68ed]/20 focus:outline-none resize-none"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleParse();
                  }}
                  disabled={parsing}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] text-white font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {parsing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Parsing Resume...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Extract Information
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                void handleImportSubmit(e);
              }}
              className="flex flex-col gap-5"
            >
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shadow-2xs">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Information extracted successfully. Review and edit the fields below before finalizing.</span>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Full Name</label>
                  <input
                    type="text"
                    value={parsedData?.identity.fullName ?? ""}
                    onChange={(e) => setParsedData(prev => prev ? { ...prev, identity: { ...prev.identity, fullName: e.target.value } } : null)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-[#1d68ed] focus:bg-white focus:ring-2 focus:ring-[#1d68ed]/20 focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Headline</label>
                  <input
                    type="text"
                    value={parsedData?.identity.headline ?? ""}
                    onChange={(e) => setParsedData(prev => prev ? { ...prev, identity: { ...prev.identity, headline: e.target.value } } : null)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-[#1d68ed] focus:bg-white focus:ring-2 focus:ring-[#1d68ed]/20 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Email</label>
                  <input
                    type="email"
                    value={parsedData?.identity.email ?? ""}
                    onChange={(e) => setParsedData(prev => prev ? { ...prev, identity: { ...prev.identity, email: e.target.value } } : null)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-[#1d68ed] focus:bg-white focus:ring-2 focus:ring-[#1d68ed]/20 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Location</label>
                  <input
                    type="text"
                    value={parsedData?.identity.location ?? ""}
                    onChange={(e) => setParsedData(prev => prev ? { ...prev, identity: { ...prev.identity, location: e.target.value } } : null)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-[#1d68ed] focus:bg-white focus:ring-2 focus:ring-[#1d68ed]/20 focus:outline-none"
                  />
                </div>
              </div>

              {/* Skills Extract Summary */}
              {parsedData?.skills && parsedData.skills.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Skills ({parsedData.skills.length})</label>
                  <div className="flex flex-wrap gap-1.5">
                    {parsedData.skills.map((skill, index) => (
                      <span
                        key={skill.id || String(index)}
                        className="text-xs px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-800 font-medium"
                      >
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experiences Summary */}
              {parsedData?.experiences && parsedData.experiences.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Work Experience ({parsedData.experiences.length})</label>
                  <div className="flex flex-col gap-2">
                    {parsedData.experiences.map((exp, index) => (
                      <div
                        key={exp.id || String(index)}
                        className="p-3 rounded-lg bg-slate-50 border border-slate-200/70"
                      >
                        <div className="font-semibold text-slate-900">{exp.title}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">{exp.company} {exp.startDate && `(${exp.startDate} - ${exp.endDate ?? "Present"})`}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStage("input")}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                >
                  Back to Text
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] text-white font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Confirm &amp; Save Profile
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
