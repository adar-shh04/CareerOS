import { Sparkles } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div style={shellStyle}>
      <div style={orbPrimary} />
      <div style={orbSecondary} />

      <div style={contentStyle}>
        <div style={brandRow}>
          <div style={logoMark}>
            <Sparkles size={18} color="#fff" />
          </div>
          <span style={brandText}>CareerOS</span>
        </div>

        <div className="glass-panel gradient-border" style={panelStyle}>
          <h1 style={titleStyle}>{title}</h1>
          <p style={subtitleStyle}>{subtitle}</p>
          {children}
        </div>

        <div style={footerStyle}>{footer}</div>
      </div>
    </div>
  );
}

interface AuthFieldProps {
  label: string;
  id: string;
  type?: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  autoComplete?: string;
}

export function AuthField({
  label,
  id,
  type = "text",
  value,
  placeholder,
  onChange,
  autoComplete,
}: AuthFieldProps) {
  return (
    <label htmlFor={id} style={labelStyle}>
      <span style={labelTextStyle}>{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        style={inputStyle}
      />
    </label>
  );
}

export function AuthButton({
  children,
  loading,
  type = "submit",
}: {
  children: ReactNode;
  loading?: boolean;
  type?: "submit" | "button";
}) {
  return (
    <button type={type} disabled={loading} style={buttonStyle(loading)}>
      {loading ? "Processing..." : children}
    </button>
  );
}

export function AuthLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} style={linkStyle}>
      {children}
    </Link>
  );
}

const shellStyle: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "2rem",
  position: "relative",
  overflow: "hidden",
  background:
    "radial-gradient(circle at top, rgba(99,102,241,0.18), transparent 40%), #080b11",
};

const orbPrimary: CSSProperties = {
  position: "absolute",
  width: "420px",
  height: "420px",
  borderRadius: "50%",
  background: "rgba(99, 102, 241, 0.15)",
  filter: "blur(80px)",
  top: "-120px",
  left: "-80px",
};

const orbSecondary: CSSProperties = {
  position: "absolute",
  width: "360px",
  height: "360px",
  borderRadius: "50%",
  background: "rgba(168, 85, 247, 0.12)",
  filter: "blur(80px)",
  bottom: "-100px",
  right: "-60px",
};

const contentStyle: CSSProperties = {
  width: "100%",
  maxWidth: "440px",
  position: "relative",
  zIndex: 1,
};

const brandRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  marginBottom: "1.5rem",
};

const logoMark: CSSProperties = {
  width: "40px",
  height: "40px",
  borderRadius: "12px",
  background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 0 24px rgba(99, 102, 241, 0.35)",
};

const brandText: CSSProperties = {
  fontSize: "1.125rem",
  fontWeight: 600,
  letterSpacing: "-0.02em",
};

const panelStyle: CSSProperties = {
  padding: "2rem",
  boxShadow: "0 24px 60px rgba(0, 0, 0, 0.35)",
};

const titleStyle: CSSProperties = {
  fontSize: "1.75rem",
  fontWeight: 700,
  letterSpacing: "-0.03em",
  marginBottom: "0.5rem",
};

const subtitleStyle: CSSProperties = {
  color: "#94a3b8",
  marginBottom: "1.75rem",
  lineHeight: 1.6,
};

const footerStyle: CSSProperties = {
  marginTop: "1.25rem",
  textAlign: "center",
  color: "#64748b",
  fontSize: "0.925rem",
};

const labelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  marginBottom: "1rem",
};

const labelTextStyle: CSSProperties = {
  fontSize: "0.875rem",
  color: "#cbd5e1",
  fontWeight: 500,
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "0.875rem 1rem",
  borderRadius: "0.75rem",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  background: "rgba(15, 23, 42, 0.65)",
  color: "#f8fafc",
  outline: "none",
  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
};

const buttonStyle = (loading?: boolean): CSSProperties => ({
  width: "100%",
  marginTop: "0.5rem",
  padding: "0.95rem 1rem",
  border: "none",
  borderRadius: "0.75rem",
  background: loading
    ? "rgba(99, 102, 241, 0.5)"
    : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
  color: "#fff",
  fontWeight: 600,
  cursor: loading ? "not-allowed" : "pointer",
  boxShadow: "0 12px 30px rgba(99, 102, 241, 0.25)",
});

const linkStyle: CSSProperties = {
  color: "#a5b4fc",
  textDecoration: "none",
  fontWeight: 500,
};
