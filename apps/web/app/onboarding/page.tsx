"use client";

import { BrainCircuit, KeyRound, Rocket, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AuthButton, AuthField } from "../../components/auth/auth-shell";
import { useAuth } from "../../providers/auth-provider";

type Step = "profile" | "byok";

const providers = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { session, loading, refreshSession } = useAuth();
  const [step, setStep] = useState<Step>("profile");
  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("My Career Workspace");
  const [targetRole, setTargetRole] = useState("");
  const [provider, setProvider] =
    useState<(typeof providers)[number]["id"]>("openai");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const hasEvaluatedInitialSession = useRef(false);

  useEffect(() => {
    if (loading || !session || hasEvaluatedInitialSession.current) {
      return;
    }
    hasEvaluatedInitialSession.current = true;
    if (!session.needsOnboarding) {
      router.replace("/dashboard");
    }
  }, [loading, session, router]);

  useEffect(() => {
    if (session?.user.name) {
      setName(session.user.name);
    }
    if (session?.workspace.name) {
      setWorkspaceName(session.workspace.name);
    }
  }, [session]);

  async function completeProfileStep(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, workspaceName, targetRole }),
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to save profile.");
      }

      await refreshSession();
      setStep("byok");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save profile.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function saveByokAndFinish(skip = false) {
    setSubmitting(true);
    setError(null);

    try {
      if (!skip && apiKey.trim()) {
        const response = await fetch("/api/byok", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, apiKey }),
        });

        const payload = (await response.json()) as { message?: string };

        if (!response.ok) {
          throw new Error(payload.message ?? "Unable to store API key.");
        }
      }

      router.push("/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to store API key.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div style={loadingStyle}>Preparing your workspace...</div>;
  }

  return (
    <div style={pageStyle}>
      <div style={orbPrimary} />
      <div style={orbSecondary} />

      <div style={containerStyle}>
        <div style={headerStyle}>
          <div style={badgeStyle}>
            <Rocket size={16} />
            Onboarding
          </div>
          <h1 style={titleStyle}>Configure your career command center</h1>
          <p style={subtitleStyle}>
            Set up your workspace and connect your AI providers with secure BYOK
            encryption.
          </p>
        </div>

        <div style={stepsRow}>
          <StepPill
            active={step === "profile"}
            label="Profile"
            icon={<BrainCircuit size={14} />}
          />
          <StepPill
            active={step === "byok"}
            label="AI Keys"
            icon={<KeyRound size={14} />}
          />
        </div>

        <div className="glass-panel gradient-border" style={panelStyle}>
          {step === "profile" ? (
            <form
              onSubmit={(event) => {
                void completeProfileStep(event);
              }}
            >
              <AuthField
                label="Your name"
                id="name"
                value={name}
                placeholder="Alex Rivera"
                onChange={setName}
              />
              <AuthField
                label="Workspace name"
                id="workspaceName"
                value={workspaceName}
                placeholder="Alex Rivera Workspace"
                onChange={setWorkspaceName}
              />
              <AuthField
                label="Target role"
                id="targetRole"
                value={targetRole}
                placeholder="Staff Fullstack Engineer"
                onChange={setTargetRole}
              />

              {error ? <p style={errorStyle}>{error}</p> : null}
              <AuthButton loading={submitting}>Continue</AuthButton>
            </form>
          ) : (
            <div>
              <div style={byokHeader}>
                <ShieldCheck size={18} color="#34d399" />
                <span>
                  Keys are encrypted with AES-256-GCM and never shown again.
                </span>
              </div>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Provider</span>
                <select
                  value={provider}
                  onChange={(event) => {
                    setProvider(event.target.value as typeof provider);
                  }}
                  style={selectStyle}
                >
                  {providers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <AuthField
                label="API key"
                id="apiKey"
                type="password"
                value={apiKey}
                placeholder="sk-..."
                onChange={setApiKey}
              />

              {error ? <p style={errorStyle}>{error}</p> : null}

              <div style={actionsRow}>
                <AuthButton loading={submitting} type="button">
                  <span onClick={() => void saveByokAndFinish(false)}>
                    Save & launch dashboard
                  </span>
                </AuthButton>
                <button
                  type="button"
                  style={skipButtonStyle}
                  disabled={submitting}
                  onClick={() => void saveByokAndFinish(true)}
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepPill({
  active,
  label,
  icon,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.5rem 0.875rem",
        borderRadius: "999px",
        border: active
          ? "1px solid rgba(99, 102, 241, 0.45)"
          : "1px solid rgba(255, 255, 255, 0.08)",
        background: active
          ? "rgba(99, 102, 241, 0.15)"
          : "rgba(15, 23, 42, 0.4)",
        color: active ? "#e0e7ff" : "#94a3b8",
        fontSize: "0.875rem",
      }}
    >
      {icon}
      {label}
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  padding: "3rem 1.5rem",
  position: "relative" as const,
  overflow: "hidden",
  background:
    "radial-gradient(circle at top, rgba(99,102,241,0.18), transparent 40%), #080b11",
};

const orbPrimary = {
  position: "absolute" as const,
  width: "420px",
  height: "420px",
  borderRadius: "50%",
  background: "rgba(99, 102, 241, 0.15)",
  filter: "blur(80px)",
  top: "-120px",
  left: "-80px",
};

const orbSecondary = {
  position: "absolute" as const,
  width: "360px",
  height: "360px",
  borderRadius: "50%",
  background: "rgba(168, 85, 247, 0.12)",
  filter: "blur(80px)",
  bottom: "-100px",
  right: "-60px",
};

const containerStyle = {
  maxWidth: "720px",
  margin: "0 auto",
  position: "relative" as const,
  zIndex: 1,
};

const headerStyle = {
  marginBottom: "1.5rem",
};

const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5rem",
  padding: "0.35rem 0.75rem",
  borderRadius: "999px",
  background: "rgba(99, 102, 241, 0.12)",
  color: "#c7d2fe",
  fontSize: "0.8125rem",
  marginBottom: "1rem",
};

const titleStyle = {
  fontSize: "2rem",
  fontWeight: 700,
  letterSpacing: "-0.03em",
  marginBottom: "0.75rem",
};

const subtitleStyle = {
  color: "#94a3b8",
  lineHeight: 1.7,
  maxWidth: "620px",
};

const stepsRow = {
  display: "flex",
  gap: "0.75rem",
  marginBottom: "1rem",
};

const panelStyle = {
  padding: "2rem",
};

const byokHeader = {
  display: "flex",
  alignItems: "center",
  gap: "0.625rem",
  padding: "0.875rem 1rem",
  borderRadius: "0.75rem",
  background: "rgba(16, 185, 129, 0.08)",
  border: "1px solid rgba(16, 185, 129, 0.18)",
  color: "#a7f3d0",
  fontSize: "0.875rem",
  marginBottom: "1.25rem",
};

const labelStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "0.5rem",
  marginBottom: "1rem",
};

const labelTextStyle = {
  fontSize: "0.875rem",
  color: "#cbd5e1",
  fontWeight: 500,
};

const selectStyle = {
  width: "100%",
  padding: "0.875rem 1rem",
  borderRadius: "0.75rem",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  background: "rgba(15, 23, 42, 0.65)",
  color: "#f8fafc",
};

const actionsRow = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "0.75rem",
};

const skipButtonStyle = {
  background: "transparent",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  color: "#94a3b8",
  borderRadius: "0.75rem",
  padding: "0.85rem 1rem",
  cursor: "pointer",
};

const errorStyle = {
  color: "#f87171",
  fontSize: "0.875rem",
  marginBottom: "0.75rem",
};

const loadingStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#94a3b8",
};
