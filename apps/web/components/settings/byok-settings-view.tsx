"use client";

import type { ByokProvider } from "@repo/types";
import {
  Check,
  CheckCircle2,
  ExternalLink,
  Info,
  KeyRound,
  Loader2,
  Lock,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import React, { useEffect, useState } from "react";

interface ProviderConfig {
  provider: ByokProvider;
  name: string;
  description: string;
  docsUrl: string;
  placeholder: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    provider: "openai",
    name: "OpenAI",
    description: "GPT-4o, GPT-4o-mini for conversational coaching and structured suggestions.",
    docsUrl: "https://platform.openai.com/api-keys",
    placeholder: "sk-proj-...",
  },
  {
    provider: "anthropic",
    name: "Anthropic",
    description: "Claude 3.5 Sonnet for in-depth resume critique and reasoning.",
    docsUrl: "https://console.anthropic.com/settings/keys",
    placeholder: "sk-ant-api03-...",
  },
  {
    provider: "google",
    name: "Google Gemini",
    description: "Gemini 1.5 Pro / Flash for rapid career analysis.",
    docsUrl: "https://aistudio.google.com/app/apikey",
    placeholder: "AIzaSy...",
  },
  {
    provider: "mistral",
    name: "Mistral AI",
    description: "Mistral Large and Codestral models.",
    docsUrl: "https://console.mistral.ai/api-keys",
    placeholder: "mistral_...",
  },
];

interface ProviderState {
  configured: boolean;
  maskedKey: string | null;
  updatedAt: string | null;
}

export function ByokSettingsView() {
  const [providerStates, setProviderStates] = useState<
    Record<string, ProviderState>
  >({});
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/byok/status");
      if (res.ok) {
        const data = (await res.json()) as {
          configured: boolean;
          providers: string[];
        };
        const states: Record<string, ProviderState> = {};
        for (const p of PROVIDERS) {
          states[p.provider] = {
            configured: data.providers.includes(p.provider),
            maskedKey: data.providers.includes(p.provider) ? "••••••••••••" : null,
            updatedAt: null,
          };
        }
        setProviderStates(states);
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    void fetchStatus();
  }, []);

  const handleSaveKey = async (provider: ByokProvider) => {
    const key = keyInputs[provider]?.trim();
    if (!key) return;

    setSavingProvider(provider);
    setFeedback(null);

    try {
      const res = await fetch("/api/byok/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: key }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        throw new Error(err.message ?? "Failed to save key.");
      }

      setKeyInputs((prev) => ({ ...prev, [provider]: "" }));
      setFeedback({
        type: "success",
        message: `${provider.toUpperCase()} API key saved securely.`,
      });
      await fetchStatus();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save key.",
      });
    } finally {
      setSavingProvider(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-bold text-white tracking-tight">
            AI Providers & Bring-Your-Own-Key (BYOK)
          </h2>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
          CareerOS is fully functional deterministically without any AI keys. Job Radar, matching, LaTeX resume editing, and application tracking never require AI. Connecting your own AI key enables advanced coaching and section-level recommendations.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" /> Client-Side Encryption
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
            <Sparkles className="w-3.5 h-3.5" /> Optional Feature
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-white/10 font-medium">
            <Lock className="w-3.5 h-3.5" /> Never Logged or Shared
          </span>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/15 border-rose-500/30 text-rose-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PROVIDERS.map((p) => {
          const state = providerStates[p.provider];
          const isConfigured = state?.configured ?? false;
          const currentInput = keyInputs[p.provider] ?? "";
          const isSaving = savingProvider === p.provider;

          return (
            <div
              key={p.provider}
              className={`p-5 rounded-xl border transition-all flex flex-col justify-between ${
                isConfigured
                  ? "bg-slate-900/80 border-emerald-500/30 shadow-lg shadow-emerald-950/20"
                  : "bg-slate-900/50 border-white/10 hover:border-white/20"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-white text-base">{p.name}</h3>
                  {isConfigured ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/5 text-[11px] font-medium">
                      Not Configured
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  {p.description}
                </p>
              </div>

              <div className="space-y-3 pt-3 border-t border-white/5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">
                    {isConfigured ? "Update API Key:" : "Enter API Key:"}
                  </span>
                  <a
                    href={p.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                  >
                    Get Key <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={currentInput}
                    onChange={(e) =>
                      setKeyInputs((prev) => ({
                        ...prev,
                        [p.provider]: e.target.value,
                      }))
                    }
                    placeholder={
                      isConfigured ? "••••••••••••••••••••" : p.placeholder
                    }
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSaveKey(p.provider)}
                    disabled={!currentInput.trim() || isSaving}
                    className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {isSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Save
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
