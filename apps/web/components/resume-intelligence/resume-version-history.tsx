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
      <div
        className="glass-panel"
        style={{
          padding: "3rem 1.5rem",
          textAlign: "center",
          color: "#94a3b8",
        }}
      >
        <History style={{ width: "36px", height: "36px", color: "#6366f1", marginBottom: "1rem" }} />
        <h4 style={{ fontSize: "1.05rem", fontWeight: "700" }}>Select a Resume Profile</h4>
        <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
          Please select a profile from the &quot;Resume Profiles&quot; tab to view or create version snapshots.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "rgba(15, 23, 42, 0.6)",
          padding: "1rem 1.5rem",
          borderRadius: "0.75rem",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>
            Immutable Resume Versions
          </h3>
          <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
            Active Profile: <strong style={{ color: "#818cf8" }}>{selectedProfile.name}</strong> • Provenance snapshots for job applications.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.6rem 1.25rem",
            borderRadius: "0.5rem",
            background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
            color: "#ffffff",
            fontWeight: "600",
            fontSize: "0.85rem",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 15px rgba(99, 102, 241, 0.3)",
          }}
        >
          <Sparkles style={{ width: "16px", height: "16px" }} />
          Generate New Version Snapshot
        </button>
      </div>

      {/* Version List */}
      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
          Loading version history...
        </div>
      ) : versions.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: "3rem 1.5rem",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <History style={{ width: "36px", height: "36px", color: "#6366f1" }} />
          <div>
            <h4 style={{ fontSize: "1.05rem", fontWeight: "700" }}>No Version Snapshots Created</h4>
            <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "0.25rem" }}>
              Generate an immutable resume snapshot for a specific application to lock in record provenance.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              backgroundColor: "rgba(99, 102, 241, 0.2)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              color: "#818cf8",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + Generate First Snapshot
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {versions.map((ver) => (
            <div
              key={ver.id}
              className="glass-panel"
              style={{
                padding: "1.25rem 1.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <FormatBadge format={ver.outputFormat} />
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <h4 style={{ fontSize: "1rem", fontWeight: "700" }}>
                      {ver.targetCompany ? `${ver.targetCompany} — ` : ""}{ver.targetRole ?? "General Application"}
                    </h4>
                    {ver.confidence && (
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: "700",
                          color: "#10b981",
                          backgroundColor: "rgba(16, 185, 129, 0.15)",
                          padding: "0.15rem 0.5rem",
                          borderRadius: "999px",
                        }}
                      >
                        {Math.round(ver.confidence * 100)}% Fit Score
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.2rem" }}>
                    {ver.explanation ?? `Generated snapshot template ${ver.templateVersion ?? "v1.0"}`}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                <div style={{ textAlign: "right", fontSize: "0.75rem", color: "#64748b" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <Clock style={{ width: "12px", height: "12px" }} />
                    {new Date(ver.createdAt).toLocaleString()}
                  </div>
                  <div>ID: {ver.id.slice(0, 8)}...</div>
                </div>

                <button
                  type="button"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.4rem 0.75rem",
                    borderRadius: "0.375rem",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#f8fafc",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  <FileDown style={{ width: "14px", height: "14px" }} />
                  Export {ver.outputFormat.toUpperCase()}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate Version Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(6px)",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: "100%",
              maxWidth: "500px",
              padding: "1.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "700" }}>Generate Resume Snapshot</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "1.25rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => void handleGenerate(e)} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <label style={labelStyle}>
                <span style={labelText}>Target Company</span>
                <input
                  type="text"
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  placeholder="e.g. Anthropic, Scale AI, Vercel"
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                <span style={labelText}>Target Role</span>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Staff AI Platform Lead"
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                <span style={labelText}>Output Format</span>
                <select
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value as ResumeOutputFormat)}
                  style={inputStyle}
                >
                  <option value="html">Interactive Web (HTML)</option>
                  <option value="latex">LaTeX Source Document (.tex)</option>
                  <option value="pdf">Compiled PDF Document (.pdf)</option>
                </select>
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "0.5rem",
                    backgroundColor: "transparent",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#94a3b8",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "0.5rem 1.25rem",
                    borderRadius: "0.5rem",
                    background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                    color: "#ffffff",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    border: "none",
                    cursor: "pointer",
                  }}
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
      <FileCode style={{ width: "16px", height: "16px", color: "#a855f7" }} />
    ) : format === "pdf" ? (
      <FileText style={{ width: "16px", height: "16px", color: "#f43f5e" }} />
    ) : (
      <Code style={{ width: "16px", height: "16px", color: "#06b6d4" }} />
    );

  return (
    <div
      style={{
        width: "40px",
        height: "40px",
        borderRadius: "10px",
        backgroundColor: "rgba(15, 23, 42, 0.8)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {icon}
    </div>
  );
}

const labelStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "0.35rem",
};

const labelText = {
  fontSize: "0.8rem",
  fontWeight: 600,
  color: "#cbd5e1",
};

const inputStyle = {
  padding: "0.6rem 0.85rem",
  borderRadius: "0.5rem",
  backgroundColor: "rgba(15, 23, 42, 0.8)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#f8fafc",
  fontSize: "0.85rem",
  outline: "none",
};
