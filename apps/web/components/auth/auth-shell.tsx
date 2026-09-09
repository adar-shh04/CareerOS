import { Compass } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

interface AuthShellProps { title: string; subtitle: string; children: ReactNode; footer: ReactNode; }

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main style={shellStyle}>
      <div style={contentStyle}>
        <Link href="/" style={brandStyle}>
          <span style={logoStyle}><Compass size={18} /></span>
          <span>Career<span style={{ color: "#1d68ed" }}>OS</span></span>
        </Link>
        <section style={panelStyle} aria-labelledby="auth-title">
          <h1 id="auth-title" style={titleStyle}>{title}</h1>
          <p style={subtitleStyle}>{subtitle}</p>
          {children}
        </section>
        <div style={footerStyle}>{footer}</div>
      </div>
    </main>
  );
}

interface AuthFieldProps { label: string; id: string; type?: string; value: string; placeholder?: string; onChange: (value: string) => void; autoComplete?: string; }
export function AuthField({ label, id, type = "text", value, placeholder, onChange, autoComplete }: AuthFieldProps) {
  return (
    <label htmlFor={id} style={labelStyle}>
      <span style={labelTextStyle}>{label}</span>
      <input id={id} type={type} value={value} placeholder={placeholder} autoComplete={autoComplete} onChange={(event) => onChange(event.target.value)} style={inputStyle} />
    </label>
  );
}
export function AuthButton({ children, loading, type = "submit" }: { children: ReactNode; loading?: boolean; type?: "submit" | "button" }) {
  return <button type={type} disabled={loading} style={buttonStyle(loading)}>{loading ? "Processing..." : children}</button>;
}
export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} style={linkStyle}>{children}</Link>;
}

const shellStyle: CSSProperties = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1.25rem", background: "linear-gradient(180deg, #f8fafd 0%, #eef4fc 100%)", color: "#0f172a" };
const contentStyle: CSSProperties = { width: "100%", maxWidth: "420px" };
const brandStyle: CSSProperties = { alignItems: "center", color: "#0f172a", display: "flex", fontSize: "1.25rem", fontWeight: 800, gap: ".65rem", marginBottom: "1.5rem", textDecoration: "none" };
const logoStyle: CSSProperties = { alignItems: "center", background: "#1d68ed", borderRadius: "8px", color: "white", display: "inline-flex", justifyContent: "center", padding: ".5rem" };
const panelStyle: CSSProperties = { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "0.75rem", boxShadow: "0 10px 25px -5px rgba(15,23,42,0.06), 0 4px 6px -2px rgba(15,23,42,0.02)", padding: "2rem" };
const titleStyle: CSSProperties = { fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.03em", marginBottom: ".35rem", color: "#0f172a" };
const subtitleStyle: CSSProperties = { color: "#64748b", fontSize: ".875rem", lineHeight: 1.5, marginBottom: "1.5rem" };
const footerStyle: CSSProperties = { color: "#64748b", fontSize: ".875rem", marginTop: "1.25rem", textAlign: "center" };
const labelStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: ".375rem", marginBottom: "1rem" };
const labelTextStyle: CSSProperties = { color: "#334155", fontSize: ".8125rem", fontWeight: 600 };
const inputStyle: CSSProperties = { background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: ".5rem", color: "#0f172a", font: "inherit", fontSize: ".875rem", outline: "none", padding: ".625rem .875rem", width: "100%", transition: "border-color .15s" };
const buttonStyle = (loading?: boolean): CSSProperties => ({ background: loading ? "#93c5fd" : "#1d68ed", border: "none", borderRadius: ".5rem", boxShadow: loading ? "none" : "0 1px 2px rgba(29,104,237,0.2)", color: "white", cursor: loading ? "not-allowed" : "pointer", fontWeight: 600, fontSize: ".875rem", marginTop: ".5rem", padding: ".625rem 1rem", width: "100%", transition: "background .15s" });
const linkStyle: CSSProperties = { color: "#1d68ed", fontWeight: 600, textDecoration: "none" };
