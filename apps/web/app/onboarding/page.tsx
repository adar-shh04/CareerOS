"use client";

import {
  ArrowRight,
  BrainCircuit,
  Briefcase,
  FileCode,
  Rocket,
  Sparkles,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

import { useAuth } from "../../providers/auth-provider";

type Step = "learn" | "career" | "preferences";

const INDUSTRIES = [
  "Technology & Software",
  "Healthcare & Medicine",
  "Finance & Banking",
  "Engineering & Hardware",
  "Data Science & Analytics",
  "Design & Creative",
  "Scientific Research & Biotech",
  "Education & Academia",
  "Business & Operations",
  "Legal & Compliance",
  "Other / Multidisciplinary",
];

const EXPERIENCE_LEVELS = [
  { id: "entry", label: "Entry-level (0–2 years)" },
  { id: "mid", label: "Mid-level (3–5 years)" },
  { id: "senior", label: "Senior (6–8 years)" },
  { id: "lead", label: "Staff / Lead (8+ years)" },
  { id: "executive", label: "Director / Executive" },
];

const WORK_ARRANGEMENTS = [
  { id: "remote", label: "Remote Preferred" },
  { id: "hybrid", label: "Hybrid" },
  { id: "onsite", label: "On-site" },
  { id: "any", label: "Flexible / Open to Any" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { session, loading, refreshSession } = useAuth();
  const [step, setStep] = useState<Step>("learn");

  // Substantive Form State
  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("My Career Workspace");
  const [field, setField] = useState("Technology & Software");
  const [targetRole, setTargetRole] = useState("");
  const [careerDirection, setCareerDirection] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("mid");
  const [locationPreference, setLocationPreference] = useState("");
  const [workArrangement, setWorkArrangement] = useState("remote");
  const [skillsInput, setSkillsInput] = useState("");
  const [activelyLooking, setActivelyLooking] = useState(true);

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

  const handleSubmitOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const skills = skillsInput
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "Candidate",
          workspaceName: workspaceName.trim() || "My Career Workspace",
          field,
          targetRole: targetRole.trim() || "Professional",
          careerDirection: careerDirection.trim() || targetRole.trim(),
          experienceLevel,
          locationPreference: locationPreference.trim(),
          workArrangement,
          skills,
          jobSearchPreferences: {
            activelyLooking,
          },
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "Failed to save onboarding data.");
      }

      await refreshSession();
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to complete onboarding.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm font-medium">
        Preparing your workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-8 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] pointer-events-none" />

      <div className="w-full max-w-2xl bg-slate-900/80 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl p-6 sm:p-10 flex flex-col gap-6 relative z-10">
        {/* Header Branding */}
        <div className="flex justify-between items-start border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Welcome to CareerOS
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                The open Career Operating System for targeted job search.
              </p>
            </div>
          </div>

          <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
            {step === "learn"
              ? "Step 1 of 3: How it Works"
              : step === "career"
                ? "Step 2 of 3: Career Target"
                : "Step 3 of 3: Preferences"}
          </span>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* ── STEP 1: Educational Architecture Overview ─────────────────── */}
        {step === "learn" && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-base font-bold text-white mb-1">
                How CareerOS Powers Your Search
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Unlike generic resume builders, CareerOS separates your master career evidence from targeted resumes, giving you full control without disposable documents.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-1.5">
                <div className="flex items-center gap-2 text-purple-400 font-bold">
                  <User className="w-4 h-4" /> Master Career Profile
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Your single source of verified career truth. Stores all your experiences, skills, education, and projects without fabrication.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-1.5">
                <div className="flex items-center gap-2 text-indigo-400 font-bold">
                  <FileCode className="w-4 h-4" /> Canonical LaTeX Resumes
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Preserves your original LaTeX code and design. Generates publication-quality typeset resumes tailored for specific roles.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-1.5">
                <div className="flex items-center gap-2 text-cyan-400 font-bold">
                  <Briefcase className="w-4 h-4" /> Job Radar & Deterministic Match
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Ingests real market opportunities and scores evidence compatibility directly against your master profile.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Sparkles className="w-4 h-4" /> Optional AI Coach
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Section-level advisory recommendations you can accept or reject independently. Never mandatory for applying.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 flex justify-end">
              <button
                type="button"
                onClick={() => setStep("career")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all"
              >
                Set Up Career Target <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Substantive Career Direction ──────────────────────── */}
        {step === "career" && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-base font-bold text-white mb-1">
                Establish Your Career Direction
              </h2>
              <p className="text-xs text-slate-400">
                This foundational data calibrates Job Radar sourcing, profile seeding, and matching.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Your Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Jane Doe"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Workspace Name</label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="e.g. Jane's Career Workspace"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Field / Industry</label>
                <select
                  value={field}
                  onChange={(e) => setField(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">
                  Target Role Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Senior Software Engineer / Clinical Researcher"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-slate-300 font-semibold">
                  Career Trajectory / Specialization (Optional)
                </label>
                <input
                  type="text"
                  value={careerDirection}
                  onChange={(e) => setCareerDirection(e.target.value)}
                  placeholder="e.g. Transitioning into Distributed Systems Architecture or Clinical Trial Operations"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-slate-300 font-semibold">Experience Level</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {EXPERIENCE_LEVELS.map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setExperienceLevel(lvl.id)}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                        experienceLevel === lvl.id
                          ? "bg-indigo-600/20 border-indigo-500 text-white font-bold"
                          : "bg-slate-950/40 border-white/10 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setStep("learn")}
                className="text-xs text-slate-400 hover:text-white"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!targetRole.trim()) {
                    setError("Please enter your target role title.");
                    return;
                  }
                  setError(null);
                  setStep("preferences");
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all"
              >
                Preferences & Skills <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Preferences & Skills ──────────────────────────────── */}
        {step === "preferences" && (
          <form
            onSubmit={(e) => {
              void handleSubmitOnboarding(e);
            }}
            className="flex flex-col gap-4"
          >
            <div>
              <h2 className="text-base font-bold text-white mb-1">
                Search Preferences & Core Skills
              </h2>
              <p className="text-xs text-slate-400">
                These help tailor Job Radar match filtering and seed your Master Career Profile.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Location Preference</label>
                  <input
                    type="text"
                    value={locationPreference}
                    onChange={(e) => setLocationPreference(e.target.value)}
                    placeholder="e.g. San Francisco, CA / London / Worldwide"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Work Arrangement</label>
                  <select
                    value={workArrangement}
                    onChange={(e) => setWorkArrangement(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    {WORK_ARRANGEMENTS.map((arr) => (
                      <option key={arr.id} value={arr.id}>
                        {arr.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">
                  Core Skills & Competencies (Comma-separated)
                </label>
                <textarea
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="e.g. TypeScript, React, Distributed Systems, PostgreSQL, Docker, AWS"
                  className="w-full h-20 px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                />
                <p className="text-[11px] text-slate-500">
                  You can also import your complete resume via LaTeX, PDF, or DOCX anytime in Resume Intelligence.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-white/5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Actively Job Searching</div>
                  <div className="text-[11px] text-slate-400">
                    Prioritize immediate job matches and high-velocity postings in Job Radar.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={activelyLooking}
                  onChange={(e) => setActivelyLooking(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-white/10 focus:ring-0"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setStep("career")}
                className="text-xs text-slate-400 hover:text-white"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                <Rocket className="w-4 h-4" />
                {submitting ? "Creating Workspace..." : "Launch CareerOS"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
