"use client";

import type { ResumeProfile, ResumeProfileInput } from "@repo/types";
import { Check, FileText, Layers, Plus } from "lucide-react";
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
            Targeted Resume Profiles
          </h3>
          <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
            Tailor section ordering, highlight emphasis, and summary messaging for specific target roles.
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
          <Plus style={{ width: "16px", height: "16px" }} />
          Create Resume Profile
        </button>
      </div>

      {/* Profiles Grid */}
      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
          Loading profiles...
        </div>
      ) : profiles.length === 0 ? (
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
          <FileText style={{ width: "36px", height: "36px", color: "#6366f1" }} />
          <div>
            <h4 style={{ fontSize: "1.05rem", fontWeight: "700" }}>No Resume Profiles Yet</h4>
            <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "0.25rem" }}>
              Create your first named resume profile to generate tailored resume versions.
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
            + Create First Profile
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {profiles.map((prof) => {
            const isSelected = selectedProfileId === prof.id;
            return (
              <div
                key={prof.id}
                onClick={() => onSelectProfile(prof.id)}
                className="glass-panel-interactive"
                style={{
                  padding: "1.25rem",
                  borderRadius: "0.75rem",
                  border: isSelected
                    ? "1px solid rgba(99, 102, 241, 0.6)"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                  backgroundColor: isSelected
                    ? "rgba(99, 102, 241, 0.1)"
                    : "rgba(17, 24, 39, 0.7)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "1rem",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <h4 style={{ fontSize: "1.05rem", fontWeight: "700" }}>
                      {prof.name}
                    </h4>
                    {isSelected && (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "999px",
                          fontSize: "0.7rem",
                          fontWeight: "700",
                          backgroundColor: "rgba(16, 185, 129, 0.15)",
                          color: "#10b981",
                        }}
                      >
                        <Check style={{ width: "12px", height: "12px" }} /> Selected
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "#818cf8",
                      fontWeight: "600",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Focus: {prof.roleFocus ?? "General Software Engineering"}
                  </div>
                  {prof.summaryGuidance && (
                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "#94a3b8",
                        lineHeight: "1.4",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      &quot;{prof.summaryGuidance}&quot;
                    </p>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: "0.75rem",
                    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                    fontSize: "0.75rem",
                    color: "#64748b",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <Layers style={{ width: "12px", height: "12px" }} />
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
              <h3 style={{ fontSize: "1.25rem", fontWeight: "700" }}>Create Named Resume Profile</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "1.25rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => void handleCreate(e)} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <label style={labelStyle}>
                <span style={labelText}>Profile Name</span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Staff AI Systems Engineer"
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                <span style={labelText}>Role Focus / Target Keywords</span>
                <input
                  type="text"
                  value={roleFocus}
                  onChange={(e) => setRoleFocus(e.target.value)}
                  placeholder="e.g. LLM Infrastructure, Distributed Systems, Node.js"
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                <span style={labelText}>Summary Guidance</span>
                <textarea
                  value={summaryGuidance}
                  onChange={(e) => setSummaryGuidance(e.target.value)}
                  placeholder="Emphasize distributed consensus, high-throughput pipelines, and AI platform architecture..."
                  rows={3}
                  style={{ ...inputStyle, resize: "none" }}
                />
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
