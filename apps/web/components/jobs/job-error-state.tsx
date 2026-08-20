"use client";

import { AlertCircle, Lock, RefreshCw, ShieldAlert, WifiOff } from "lucide-react";
import Link from "next/link";
import React from "react";

export interface JobErrorStateProps {
  status: number;
  message?: string;
  onRetry?: () => void;
}

export function JobErrorState({
  status,
  message,
  onRetry,
}: JobErrorStateProps) {
  if (status === 401) {
    return (
      <div
        className="glass-panel"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "3.5rem 2rem",
          textAlign: "center",
          borderRadius: "1rem",
          border: "1px solid rgba(239, 68, 68, 0.25)",
          background: "rgba(15, 23, 42, 0.75)",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "14px",
            background: "rgba(239, 68, 68, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1.25rem",
            color: "#f87171",
          }}
        >
          <Lock size={28} />
        </div>

        <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.5rem", color: "#f8fafc" }}>
          Authentication Required
        </h3>
        <p style={{ color: "#94a3b8", maxWidth: "420px", fontSize: "0.925rem", marginBottom: "1.75rem", lineHeight: "1.5" }}>
          {message ?? "Your session could not be verified or has expired. Please sign in to access Job Radar."}
        </p>

        <Link
          href="/login"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.625rem 1.25rem",
            borderRadius: "0.5rem",
            background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
            color: "#ffffff",
            fontWeight: "600",
            fontSize: "0.875rem",
            textDecoration: "none",
            boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
          }}
        >
          Sign in again
        </Link>
      </div>
    );
  }

  if (status === 403) {
    return (
      <div
        className="glass-panel"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "3.5rem 2rem",
          textAlign: "center",
          borderRadius: "1rem",
          border: "1px solid rgba(245, 158, 11, 0.25)",
          background: "rgba(15, 23, 42, 0.75)",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "14px",
            background: "rgba(245, 158, 11, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1.25rem",
            color: "#fbbf24",
          }}
        >
          <ShieldAlert size={28} />
        </div>

        <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.5rem", color: "#f8fafc" }}>
          Access Forbidden
        </h3>
        <p style={{ color: "#94a3b8", maxWidth: "420px", fontSize: "0.925rem", marginBottom: "1.5rem", lineHeight: "1.5" }}>
          {message ?? "You do not have permission to view jobs in this workspace."}
        </p>
      </div>
    );
  }

  const isNetwork = status === 0;

  return (
    <div
      className="glass-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3.5rem 2rem",
        textAlign: "center",
        borderRadius: "1rem",
        border: "1px solid rgba(239, 68, 68, 0.2)",
        background: "rgba(15, 23, 42, 0.75)",
      }}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "14px",
          background: "rgba(239, 68, 68, 0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "1.25rem",
          color: "#f87171",
        }}
      >
        {isNetwork ? <WifiOff size={28} /> : <AlertCircle size={28} />}
      </div>

      <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.5rem", color: "#f8fafc" }}>
        {isNetwork ? "Network Connection Error" : "Unable to Load Job Opportunities"}
      </h3>
      <p style={{ color: "#94a3b8", maxWidth: "420px", fontSize: "0.925rem", marginBottom: "1.75rem", lineHeight: "1.5" }}>
        {message ?? "An unexpected error occurred while communicating with the server."}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.625rem 1.25rem",
            borderRadius: "0.5rem",
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            color: "#f8fafc",
            fontWeight: "600",
            fontSize: "0.875rem",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <RefreshCw size={16} />
          Retry Request
        </button>
      )}
    </div>
  );
}
