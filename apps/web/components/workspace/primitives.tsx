"use client";

import { Info } from "lucide-react";
import type { ReactNode } from "react";

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`instrument-panel ${className}`}>{children}</section>;
}

export function StatusChip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" }) {
  return <span className={`status-chip status-${tone}`}>{children}</span>;
}

export function SkillChip({ children, matched = true }: { children: ReactNode; matched?: boolean }) {
  return <span className={`skill-chip ${matched ? "skill-matched" : "skill-missing"}`}>{children}</span>;
}

export function FitScore({ score, onWhy }: { score: number; onWhy?: () => void }) {
  const tone = score >= 75 ? "success" : score >= 40 ? "warning" : "danger";
  return (
    <span className="fit-score-wrap">
      <span className={`fit-score fit-${tone}`} aria-label={`Fit score ${String(score)} percent`}>
        <span className="data-number">{score}%</span>
      </span>
      <button className="why-button" onClick={onWhy} type="button" aria-label={`Why this job has a ${String(score)} percent fit score`}>
        <Info aria-hidden="true" /> Why
      </button>
    </span>
  );
}

export function StructuredRow({ label, value, children }: { label: string; value?: ReactNode; children?: ReactNode }) {
  return <div className="structured-row"><span>{label}</span><strong>{value ?? children}</strong></div>;
}

export function DocumentSurface({ children }: { children: ReactNode }) {
  return <article className="document-surface">{children}</article>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action: ReactNode }) {
  return <div className="empty-state"><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <header className="page-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</header>;
}
