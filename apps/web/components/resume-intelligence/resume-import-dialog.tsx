import type { MasterCareerProfileInput } from "@repo/types";
import {
  Check,
  FileCode,
  FileText,
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
  onImportComplete: (data: MasterCareerProfileInput) => Promise<void>;
}

export function ResumeImportDialog({
  onClose,
  onImportComplete,
}: ResumeImportDialogProps) {
  const [inputMode, setInputMode] = useState<"file" | "text">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stages: "input" | "review"
  const [stage, setStage] = useState<"input" | "review">("input");
  const [parsedData, setParsedData] =
    useState<MasterCareerProfileInput | null>(null);

  const validateAndSetFile = (file: File) => {
    setError(null);
    const validExtensions = [".pdf", ".docx", ".txt", ".md", ".json"];
    const hasValidExt = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext),
    );
    if (!hasValidExt) {
      setError(
        "Please select a supported file (.pdf, .docx, .txt, .md, .json).",
      );
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds the 10MB limit.");
      return;
    }
    setSelectedFile(file);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
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
      if (!resumeText.trim()) {
        setError("Please paste some resume text first.");
        return;
      }

      setParsing(true);
      setError(null);
      try {
        const response = await fetch("/api/resume-profiles/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeText }),
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
      await onImportComplete(parsedData);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to import profile data.",
      );
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "1.5rem",
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: stage === "input" ? "620px" : "850px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "1rem",
          overflow: "hidden",
          backgroundColor: "#0b0f19",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Upload style={{ width: "18px", height: "18px", color: "#c084fc" }} />
            <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>
              {stage === "input"
                ? "Import Existing Resume"
                : "Review Extracted Career Profile"}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: "1.1rem",
            }}
          >
            <X style={{ width: "18px", height: "18px" }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1rem",
                borderRadius: "0.5rem",
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                color: "#fca5a5",
                fontSize: "0.85rem",
                marginBottom: "1rem",
              }}
            >
              <ShieldAlert
                style={{ width: "16px", height: "16px", flexShrink: 0 }}
              />
              <span>{error}</span>
            </div>
          )}

          {stage === "input" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              {/* Tab Selector */}
              <div
                style={{
                  display: "flex",
                  borderRadius: "0.5rem",
                  backgroundColor: "rgba(15, 23, 42, 0.7)",
                  padding: "0.25rem",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setInputMode("file")}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    borderRadius: "0.375rem",
                    border: "none",
                    backgroundColor:
                      inputMode === "file" ? "rgba(99, 102, 241, 0.2)" : "transparent",
                    color: inputMode === "file" ? "#ffffff" : "#94a3b8",
                    fontWeight: inputMode === "file" ? "700" : "500",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.4rem",
                    transition: "all 0.15s",
                  }}
                >
                  <UploadCloud style={{ width: "15px", height: "15px" }} />
                  Upload Document
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("text")}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    borderRadius: "0.375rem",
                    border: "none",
                    backgroundColor:
                      inputMode === "text" ? "rgba(99, 102, 241, 0.2)" : "transparent",
                    color: inputMode === "text" ? "#ffffff" : "#94a3b8",
                    fontWeight: inputMode === "text" ? "700" : "500",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.4rem",
                    transition: "all 0.15s",
                  }}
                >
                  <FileText style={{ width: "15px", height: "15px" }} />
                  Paste Raw Text
                </button>
              </div>

              {inputMode === "file" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.md,.json,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,application/json"
                    onChange={handleFileSelect}
                    style={{ display: "none" }}
                  />

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: isDragging
                        ? "2px dashed #818cf8"
                        : "2px dashed rgba(255, 255, 255, 0.12)",
                      borderRadius: "0.75rem",
                      padding: "2.5rem 1.5rem",
                      textAlign: "center",
                      backgroundColor: isDragging
                        ? "rgba(99, 102, 241, 0.1)"
                        : "rgba(15, 23, 42, 0.5)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "12px",
                        background: "rgba(99, 102, 241, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#818cf8",
                      }}
                    >
                      {selectedFile ? (
                        <FileCode style={{ width: "24px", height: "24px" }} />
                      ) : (
                        <UploadCloud style={{ width: "24px", height: "24px" }} />
                      )}
                    </div>

                    {selectedFile ? (
                      <div>
                        <div
                          style={{
                            fontSize: "0.95rem",
                            fontWeight: "700",
                            color: "#ffffff",
                          }}
                        >
                          {selectedFile.name}
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "#94a3b8",
                            marginTop: "0.2rem",
                          }}
                        >
                          {(selectedFile.size / 1024).toFixed(1)} KB • Click or
                          drop another file to replace
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div
                          style={{
                            fontSize: "0.9rem",
                            fontWeight: "600",
                            color: "#e2e8f0",
                          }}
                        >
                          Click to upload or drag & drop
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "#64748b",
                            marginTop: "0.25rem",
                          }}
                        >
                          Supported formats: PDF, DOCX, TXT, Markdown, JSON (up
                          to 10MB)
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <p
                    style={{
                      fontSize: "0.8rem",
                      color: "#94a3b8",
                      lineHeight: "1.4",
                    }}
                  >
                    Paste the full text of your existing resume. The parser will
                    extract identity, education, experience, projects, and
                    skills.
                  </p>

                  <textarea
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Paste resume content here..."
                    style={{
                      width: "100%",
                      height: "220px",
                      borderRadius: "0.5rem",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      backgroundColor: "rgba(15, 23, 42, 0.6)",
                      color: "#ffffff",
                      padding: "1rem",
                      fontSize: "0.85rem",
                      fontFamily: "monospace",
                      resize: "none",
                      outline: "none",
                    }}
                  />
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.75rem",
                  marginTop: "0.5rem",
                }}
              >
                <button
                  onClick={onClose}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "0.375rem",
                    border: "1px solid rgba(255,255,255,0.06)",
                    backgroundColor: "transparent",
                    color: "#94a3b8",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    void handleParse();
                  }}
                  disabled={parsing}
                  style={{
                    padding: "0.5rem 1.25rem",
                    borderRadius: "0.375rem",
                    background:
                      "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                    color: "#ffffff",
                    fontWeight: "600",
                    fontSize: "0.85rem",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    opacity: parsing ? 0.7 : 1,
                  }}
                >
                  {parsing ? (
                    <>
                      <Loader2
                        style={{
                          width: "14px",
                          height: "14px",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                      Parsing Resume...
                    </>
                  ) : (
                    <>
                      <Sparkles style={{ width: "14px", height: "14px" }} />
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
              style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
            >
              <div
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "0.5rem",
                  backgroundColor: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.15)",
                  color: "#34d399",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Check style={{ width: "16px", height: "16px" }} />
                <span>Information extracted successfully. Review and edit the fields below before finalizing.</span>
              </div>

              {/* Form Fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", marginBottom: "0.35rem" }}>Full Name</label>
                  <input
                    type="text"
                    value={parsedData?.identity.fullName ?? ""}
                    onChange={(e) => setParsedData(prev => prev ? { ...prev, identity: { ...prev.identity, fullName: e.target.value } } : null)}
                    style={inputStyle}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", marginBottom: "0.35rem" }}>Headline</label>
                  <input
                    type="text"
                    value={parsedData?.identity.headline ?? ""}
                    onChange={(e) => setParsedData(prev => prev ? { ...prev, identity: { ...prev.identity, headline: e.target.value } } : null)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", marginBottom: "0.35rem" }}>Email</label>
                  <input
                    type="email"
                    value={parsedData?.identity.email ?? ""}
                    onChange={(e) => setParsedData(prev => prev ? { ...prev, identity: { ...prev.identity, email: e.target.value } } : null)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", marginBottom: "0.35rem" }}>Location</label>
                  <input
                    type="text"
                    value={parsedData?.identity.location ?? ""}
                    onChange={(e) => setParsedData(prev => prev ? { ...prev, identity: { ...prev.identity, location: e.target.value } } : null)}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Skills Extract Summary */}
              {parsedData?.skills && parsedData.skills.length > 0 && (
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", marginBottom: "0.5rem" }}>Skills ({parsedData.skills.length})</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                    {parsedData.skills.map((skill, index) => (
                      <span
                        key={skill.id || String(index)}
                        style={{
                          fontSize: "0.75rem",
                          padding: "0.25rem 0.5rem",
                          borderRadius: "0.375rem",
                          backgroundColor: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "#cbd5e1",
                        }}
                      >
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experiences Summary */}
              {parsedData?.experiences && parsedData.experiences.length > 0 && (
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", marginBottom: "0.5rem" }}>Work Experience ({parsedData.experiences.length})</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {parsedData.experiences.map((exp, index) => (
                      <div
                        key={exp.id || String(index)}
                        style={{
                          padding: "0.75rem",
                          borderRadius: "0.5rem",
                          backgroundColor: "rgba(15, 23, 42, 0.4)",
                          border: "1px solid rgba(255,255,255,0.04)",
                        }}
                      >
                        <div style={{ fontWeight: "600", fontSize: "0.85rem" }}>{exp.title}</div>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{exp.company} {exp.startDate && `(${exp.startDate} - ${exp.endDate ?? "Present"})`}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setStage("input")}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "0.375rem",
                    border: "1px solid rgba(255,255,255,0.06)",
                    backgroundColor: "transparent",
                    color: "#94a3b8",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  Back to Text
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "0.5rem 1.25rem",
                    borderRadius: "0.375rem",
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "#ffffff",
                    fontWeight: "600",
                    fontSize: "0.85rem",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  Confirm & Save Profile
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "0.625rem 0.85rem",
  borderRadius: "0.375rem",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  backgroundColor: "rgba(15, 23, 42, 0.6)",
  color: "#ffffff",
  fontSize: "0.85rem",
  outline: "none",
};
