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
    <div className="flex flex-col gap-6 w-full">
      {/* Header Banner */}
      <div className="p-6 rounded-xl border border-slate-200/80 bg-white shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound className="w-5 h-5 text-[#1d68ed]" />
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            AI Providers &amp; Bring-Your-Own-Key (BYOK)
          </h2>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
          CareerOS is fully functional deterministically without any AI keys. Job Radar, matching, LaTeX resume editing, and application tracking never require AI. Connecting your own AI key enables advanced coaching and section-level recommendations.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Client-Side Encryption
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#1d68ed] border border-blue-200/80 font-medium">
            <Sparkles className="w-3.5 h-3.5" /> Optional Feature
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200/80 font-medium">
            <Lock className="w-3.5 h-3.5 text-slate-400" /> Never Logged or Shared
          </span>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-2 shadow-2xs ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Provider Cards */}
      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
        {PROVIDERS.map((p) => {
          const state = providerStates[p.provider];
          const isConfigured = state?.configured ?? false;
          const currentInput = keyInputs[p.provider] ?? "";
          const isSaving = savingProvider === p.provider;

          return (
            <div
              key={p.provider}
              className={`p-5 rounded-xl border transition-all flex flex-col justify-between shadow-xs ${
                isConfigured
                  ? "bg-white border-emerald-300"
                  : "bg-white border-slate-200/80 hover:border-slate-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-900 text-base">{p.name}</h3>
                  {isConfigured ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" /> Active
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-[11px] font-medium">
                      Not Configured
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  {p.description}
                </p>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">
                    {isConfigured ? "Update API Key:" : "Enter API Key:"}
                  </span>
                  <a
                    href={p.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#1d68ed] hover:text-[#1555c8] font-semibold flex items-center gap-0.5"
                  >
                    Get Key <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
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
                    className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs focus:outline-none focus:border-[#1d68ed] focus:bg-white focus:ring-2 focus:ring-[#1d68ed]/20"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSaveKey(p.provider)}
                    disabled={!currentInput.trim() || isSaving}
                    className="shrink-0 px-3.5 py-2 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] text-white font-semibold text-xs transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
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
