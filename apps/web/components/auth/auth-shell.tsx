import { Compass } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

interface AuthShellProps { title: string; subtitle: string; children: ReactNode; footer: ReactNode; }

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return <main style={shellStyle}><div style={contentStyle}><Link href="/" style={brandStyle}><span style={logoStyle}><Compass size={18} /></span><span>Career<span style={{ color: "#0fa9b4" }}>OS</span></span></Link><section style={panelStyle} aria-labelledby="auth-title"><h1 id="auth-title" style={titleStyle}>{title}</h1><p style={subtitleStyle}>{subtitle}</p>{children}</section><div style={footerStyle}>{footer}</div></div></main>;
}

interface AuthFieldProps { label: string; id: string; type?: string; value: string; placeholder?: string; onChange: (value: string) => void; autoComplete?: string; }
export function AuthField({ label, id, type = "text", value, placeholder, onChange, autoComplete }: AuthFieldProps) { return <label htmlFor={id} style={labelStyle}><span style={labelTextStyle}>{label}</span><input id={id} type={type} value={value} placeholder={placeholder} autoComplete={autoComplete} onChange={(event) => onChange(event.target.value)} style={inputStyle} /></label>; }
export function AuthButton({ children, loading, type = "submit" }: { children: ReactNode; loading?: boolean; type?: "submit" | "button" }) { return <button type={type} disabled={loading} style={buttonStyle(loading)}>{loading ? "Processing..." : children}</button>; }
export function AuthLink({ href, children }: { href: string; children: ReactNode }) { return <Link href={href} style={linkStyle}>{children}</Link>; }

const shellStyle: CSSProperties = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1.25rem", background: "linear-gradient(145deg, #c9f1ed 0%, #f7fbfa 58%, #e4f5ef 100%)", color: "#12343b" };
const contentStyle: CSSProperties = { width: "100%", maxWidth: "440px" };
const brandStyle: CSSProperties = { alignItems: "center", color: "#12343b", display: "flex", fontSize: "1.2rem", fontWeight: 800, gap: ".65rem", marginBottom: "1.5rem", textDecoration: "none" };
const logoStyle: CSSProperties = { alignItems: "center", background: "#0fa9b4", borderRadius: "10px", color: "white", display: "inline-flex", justifyContent: "center", padding: ".55rem" };
const panelStyle: CSSProperties = { background: "#ffffff", border: "1px solid #d6e8e4", borderRadius: "1rem", boxShadow: "0 24px 60px rgba(18,52,59,.12)", padding: "2rem" };
const titleStyle: CSSProperties = { fontSize: "1.75rem", fontWeight: 750, letterSpacing: "-0.04em", marginBottom: ".5rem" };
const subtitleStyle: CSSProperties = { color: "#5e777b", lineHeight: 1.6, marginBottom: "1.75rem" };
const footerStyle: CSSProperties = { color: "#5e777b", fontSize: ".925rem", marginTop: "1.25rem", textAlign: "center" };
const labelStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: ".5rem", marginBottom: "1rem" };
const labelTextStyle: CSSProperties = { color: "#31545a", fontSize: ".875rem", fontWeight: 650 };
const inputStyle: CSSProperties = { background: "#f7fbfa", border: "1px solid #c9ddda", borderRadius: ".65rem", color: "#12343b", font: "inherit", outline: "none", padding: ".875rem 1rem", width: "100%" };
const buttonStyle = (loading?: boolean): CSSProperties => ({ background: loading ? "#8acfd0" : "#0fa9b4", border: "none", borderRadius: ".65rem", boxShadow: loading ? "none" : "0 10px 22px rgba(15,169,180,.2)", color: "white", cursor: loading ? "not-allowed" : "pointer", fontWeight: 750, marginTop: ".5rem", padding: ".95rem 1rem", width: "100%" });
const linkStyle: CSSProperties = { color: "#0b8e98", fontWeight: 700, textDecoration: "none" };
