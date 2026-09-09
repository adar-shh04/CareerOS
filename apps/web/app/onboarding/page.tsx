"use client";

import type { MasterCareerProfileInput } from "@repo/types";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  Compass,
  FileCode,
  FileText,
  Loader2,
  MapPin,
  Rocket,
  Sparkles,
  Upload,
  UserCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

import { useAuth } from "../../providers/auth-provider";

type OnboardingStep =
  | "welcome"
  | "about"
  | "import"
  | "review"
  | "target"
  | "preferences"
  | "workspace";

const STEPS: { id: OnboardingStep; label: string }[] = [
  { id: "welcome", label: "Welcome" },
  { id: "about", label: "About You" },
  { id: "import", label: "Import" },
  { id: "review", label: "Review" },
  { id: "target", label: "Target Roles" },
  { id: "preferences", label: "Preferences" },
  { id: "workspace", label: "Workspace" },
];

const INDUSTRIES = [
  "Technology & Software",
  "Data Science & Analytics",
  "Product Management",
  "Design & Creative",
  "Finance & Fintech",
  "Healthcare & Biotech",
  "Engineering & Hardware",
  "Business & Operations",
  "Other / Multidisciplinary",
];

const EXPERIENCE_LEVELS = [
  { id: "entry", label: "Entry-level", range: "0–2 years" },
  { id: "mid", label: "Mid-level", range: "3–5 years" },
  { id: "senior", label: "Senior", range: "6–8 years" },
  { id: "lead", label: "Staff / Lead", range: "8+ years" },
  { id: "executive", label: "Director / Executive", range: "10+ years" },
];

const WORK_ARRANGEMENTS = [
  { id: "remote", label: "Remote Preferred", desc: "Distributed or home-based" },
  { id: "hybrid", label: "Hybrid", desc: "Balanced office and remote" },
  { id: "onsite", label: "On-site", desc: "Full-time in office" },
  { id: "any", label: "Flexible", desc: "Open to any arrangement" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { session, loading, refreshSession } = useAuth();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");

  // Form State
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [locationPreference, setLocationPreference] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseStatus, setParseStatus] = useState<string | null>(null);

  // Extracted/Reviewed Data
  const [extractedProfile, setExtractedProfile] =
    useState<MasterCareerProfileInput | null>(null);

  // Target & Preferences
  const [field, setField] = useState("Technology & Software");
  const [targetRole, setTargetRole] = useState("");
  const [careerDirection, setCareerDirection] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("mid");
  const [workArrangement, setWorkArrangement] = useState("remote");
  const [skillsInput, setSkillsInput] = useState("");
  const [activelyLooking, setActivelyLooking] = useState(true);

  // Workspace
  const [workspaceName, setWorkspaceName] = useState("My Career Workspace");

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
    const userName = session?.user.name;
    if (userName) {
      setName((prev) => (prev.length > 0 ? prev : userName));
    }
    const wsName = session?.workspace.name;
    if (wsName && wsName !== "Workspace") {
      setWorkspaceName((prev) => (prev.length > 0 ? prev : wsName));
    }
  }, [session]);

  /* ── Resume Parsing Handler ─────────────────────────────────────────── */
  const handleParseResume = async () => {
    if (!selectedFile && !resumeText.trim()) {
      setError("Please select a resume file or paste text to extract.");
      return;
    }

    setIsParsing(true);
    setParseStatus("Analyzing resume structure and extracting verified evidence...");
    setError(null);

    try {
      let response: Response;

      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        response = await fetch("/api/resume-profiles/parse", {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch("/api/resume-profiles/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeText }),
        });
      }

      if (!response.ok) {
        const errPayload = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(errPayload.message ?? "Parsing failed.");
      }

      const parsed = (await response.json()) as MasterCareerProfileInput;
      setExtractedProfile(parsed);

      // Pre-fill fields from extracted data
      if (parsed.identity.fullName && !name) {
        setName(parsed.identity.fullName);
      }
      if (parsed.identity.headline) {
        setHeadline(parsed.identity.headline);
        setTargetRole(parsed.identity.headline);
      }
      if (parsed.identity.location) {
        setLocationPreference(parsed.identity.location);
      }
      if (parsed.skills?.length) {
        const extractedSkillNames = parsed.skills.map((s) => s.name);
        setSkillsInput(extractedSkillNames.join(", "));
      }

      setParseStatus("Resume successfully extracted into Master Profile evidence.");
      setTimeout(() => {
        setCurrentStep("review");
      }, 600);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to parse resume. You can still proceed by entering your details manually.",
      );
    } finally {
      setIsParsing(false);
    }
  };

  /* ── Final Submission Handler ───────────────────────────────────────── */
  const handleComplete = async () => {
    if (!targetRole.trim()) {
      setError("Target role is required.");
      setCurrentStep("target");
      return;
    }

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
          targetRole: targetRole.trim(),
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
        throw new Error(payload.message ?? "Failed to save onboarding configuration.");
      }

      await refreshSession();
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to establish workspace. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafd] flex items-center justify-center text-slate-500 text-xs">
        <Loader2 className="w-4 h-4 animate-spin mr-2 text-[#1d68ed]" />
        Checking session status...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafd] text-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative">
      {/* Container */}
      <div className="w-full max-w-3xl rounded-xl border border-slate-200/80 bg-white p-6 sm:p-10 shadow-xs flex flex-col gap-6 relative z-10">
        {/* Header Branding & Step Counter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0d131f] text-[#38bdf8] shadow-xs">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                Career<span className="text-[#1d68ed]">OS</span> Setup
              </h1>
              <p className="text-xs text-slate-500">
                Establish your unified career operating environment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-[#1d68ed]">
              Step {currentStepIndex + 1}
            </span>
            <span className="text-slate-400">of {STEPS.length}:</span>
            <span className="text-slate-700 font-semibold">
              {STEPS[currentStepIndex]?.label}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-[#1d68ed] h-full transition-all duration-300 rounded-full"
            style={{
              width: `${String(((currentStepIndex + 1) / STEPS.length) * 100)}%`,
            }}
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* ── STEP 1: WELCOME ────────────────────────────────────────────── */}
        {currentStep === "welcome" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-1.5">
                Welcome to your Career Operating System
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                CareerOS reduces repetitive search toil and boosts interview conversion by managing your career evidence centrally. Everything connects: your Master Career Profile drives targeted resumes, job matching, application tracking, and AI insights.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-slate-200/80 bg-[#f4f8ff] p-4 space-y-1">
                <div className="flex items-center gap-2 font-semibold text-[#1d68ed]">
                  <UserCheck className="w-4 h-4" /> Master Career Profile
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Single source of verified career truth. Never invent claims or overwrite your core records.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-4 space-y-1">
                <div className="flex items-center gap-2 font-semibold text-indigo-700">
                  <Briefcase className="w-4 h-4" /> Job Radar &amp; Evidence Matching
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Deterministic scoring that explains matched and missing skills transparently without opaque AI hallucinations.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-4 space-y-1">
                <div className="flex items-center gap-2 font-semibold text-purple-700">
                  <FileCode className="w-4 h-4" /> Resume Studio
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Persistent, versioned resumes tailored per role. Preserves LaTeX templates and typesetting precision.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-4 space-y-1">
                <div className="flex items-center gap-2 font-semibold text-emerald-700">
                  <Sparkles className="w-4 h-4" /> AI Coach &amp; BYOK Control
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Contextual section-level coaching with your own API keys. Completely private and self-hosted.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200/80 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setCurrentStep("about");
                }}
                className="flex items-center gap-2 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: ABOUT YOU ─────────────────────────────────────────── */}
        {currentStep === "about" && (
          <div className="space-y-4 text-xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight mb-1">
                Tell us about yourself
              </h2>
              <p className="text-xs text-slate-500">
                This basic identity anchors your Master Career Profile.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-slate-800 font-semibold">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 text-xs focus:border-[#1d68ed] focus:bg-white focus:ring-2 focus:ring-[#1d68ed]/20 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-800 font-semibold">
                  Professional Headline / Current Role
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Senior Full-Stack Engineer / Distributed Systems Specialist"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 text-xs focus:border-[#1d68ed] focus:bg-white focus:ring-2 focus:ring-[#1d68ed]/20 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-800 font-semibold">
                  Current Location
                </label>
                <input
                  type="text"
                  value={locationPreference}
                  onChange={(e) => setLocationPreference(e.target.value)}
                  placeholder="e.g. San Francisco, CA / London, UK / Remote"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 text-xs focus:border-[#1d68ed] focus:bg-white focus:ring-2 focus:ring-[#1d68ed]/20 focus:outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200/80 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setCurrentStep("welcome")}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!name.trim()) {
                    setError("Please enter your name.");
                    return;
                  }
                  setError(null);
                  setCurrentStep("import");
                }}
                className="flex items-center gap-2 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
              >
                Continue to Resume Import <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: IMPORT RESUME ─────────────────────────────────────── */}
        {currentStep === "import" && (
          <div className="space-y-4 text-xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight mb-1">
                Import your existing resume (Optional)
              </h2>
              <p className="text-xs text-slate-500">
                Upload your resume (PDF, DOCX, LaTeX, or TXT) to automatically extract your experiences, projects, education, and skills into your Master Career Profile.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              {/* File upload area */}
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 flex flex-col items-center justify-center text-center gap-3">
                <Upload className="w-8 h-8 text-[#1d68ed]" />
                <div>
                  <label
                    htmlFor="resume-file"
                    className="cursor-pointer text-[#1d68ed] hover:text-[#1555c8] font-semibold underline underline-offset-2"
                  >
                    Click to select a resume file
                  </label>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Supports PDF, DOCX, LaTeX (.tex), or plain text (max 10MB)
                  </p>
                  <input
                    id="resume-file"
                    type="file"
                    accept=".pdf,.docx,.doc,.tex,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setSelectedFile(file);
                      if (file) {
                        setError(null);
                      }
                    }}
                    className="hidden"
                  />
                </div>
                {selectedFile && (
                  <div className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-[#1d68ed] font-medium">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[200px]">
                      {selectedFile.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Or paste text */}
              <div className="space-y-1">
                <label className="text-slate-800 font-semibold">
                  Or paste resume text / LaTeX code:
                </label>
                <textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste raw text or LaTeX code here..."
                  className="w-full h-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 text-xs focus:border-[#1d68ed] focus:bg-white focus:ring-2 focus:ring-[#1d68ed]/20 focus:outline-none resize-none font-mono"
                />
              </div>

              {parseStatus && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{parseStatus}</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200/80 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setCurrentStep("about")}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setCurrentStep("target");
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  Skip import (Enter manually)
                </button>
                <button
                  type="button"
                  disabled={isParsing || (!selectedFile && !resumeText.trim())}
                  onClick={() => void handleParseResume()}
                  className="flex items-center gap-2 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] disabled:opacity-40 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Extracting...
                    </>
                  ) : (
                    <>
                      Extract &amp; Review <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: REVIEW EXTRACTED INFORMATION ──────────────────────── */}
        {currentStep === "review" && (
          <div className="space-y-4 text-xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight mb-1">
                Review Extracted Information
              </h2>
              <p className="text-xs text-slate-500">
                Verify what was extracted from your resume. You can refine everything anytime in the Career Profile editor.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-4 space-y-2">
                <div className="text-slate-500 font-semibold uppercase text-[11px]">Identity &amp; Headline</div>
                <div className="text-sm font-bold text-slate-900">
                  {name || "No name detected"}
                </div>
                <div className="text-slate-600">
                  {headline || targetRole || "No headline detected"}
                </div>
                {locationPreference && (
                  <div className="text-slate-600 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#1d68ed]" /> {locationPreference}
                  </div>
                )}
              </div>

              {extractedProfile?.experiences && extractedProfile.experiences.length > 0 && (
                <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-4 space-y-2">
                  <div className="text-slate-500 font-semibold uppercase text-[11px]">
                    Extracted Roles ({extractedProfile.experiences.length})
                  </div>
                  <div className="space-y-1.5">
                    {extractedProfile.experiences.slice(0, 3).map((exp, idx) => (
                      <div key={idx} className="flex justify-between text-slate-900">
                        <span className="font-semibold">{exp.title}</span>
                        <span className="text-slate-500">{exp.company}</span>
                      </div>
                    ))}
                    {extractedProfile.experiences.length > 3 && (
                      <div className="text-[11px] text-slate-500">
                        + {extractedProfile.experiences.length - 3} more roles captured
                      </div>
                    )}
                  </div>
                </div>
              )}

              {extractedProfile?.skills && extractedProfile.skills.length > 0 && (
                <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-4 space-y-2">
                  <div className="text-slate-500 font-semibold uppercase text-[11px]">
                    Identified Skills ({extractedProfile.skills.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {extractedProfile.skills.slice(0, 12).map((skill, idx) => (
                      <span
                        key={idx}
                        className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-800 font-medium"
                      >
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200/80 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setCurrentStep("import")}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setCurrentStep("target");
                }}
                className="flex items-center gap-2 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
              >
                Confirm &amp; Set Target Roles <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5: FIELD & TARGET ROLES ──────────────────────────────── */}
        {currentStep === "target" && (
          <div className="space-y-4 text-xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight mb-1">
                Field &amp; Target Role
              </h2>
              <p className="text-xs text-slate-500">
                These calibrate Job Radar opportunity ingestion and match scoring.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-slate-800 font-semibold">Industry / Domain</label>
                <select
                  value={field}
                  onChange={(e) => setField(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 text-xs focus:border-[#1d68ed] focus:bg-white focus:ring-2 focus:ring-[#1d68ed]/20 focus:outline-none"
                >
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-800 font-semibold">
                  Target Role Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Senior Backend Engineer"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 text-xs focus:border-[#1d68ed] focus:bg-white focus:ring-2 focus:ring-[#1d68ed]/20 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-slate-800 font-semibold">
                  Career Trajectory / Specialization (Optional)
                </label>
                <input
                  type="text"
                  value={careerDirection}
                  onChange={(e) => setCareerDirection(e.target.value)}
                  placeholder="e.g. Transitioning toward distributed systems infrastructure and platform engineering"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 text-xs focus:border-[#1d68ed] focus:bg-white focus:ring-2 focus:ring-[#1d68ed]/20 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-slate-800 font-semibold">
                  Target Seniority Level
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  {EXPERIENCE_LEVELS.map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setExperienceLevel(lvl.id)}
                      className={`rounded-lg border p-2.5 text-left transition-all cursor-pointer ${
                        experienceLevel === lvl.id
                          ? "border-[#1d68ed] bg-[#f4f8ff] text-[#1d68ed] font-semibold shadow-xs"
                          : "border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <div className="font-medium text-xs">{lvl.label}</div>
                      <div className="text-[10px] text-slate-400">{lvl.range}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200/80 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setCurrentStep("about")}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!targetRole.trim()) {
                    setError("Please enter your target role title.");
                    return;
                  }
                  setError(null);
                  setCurrentStep("preferences");
                }}
                className="flex items-center gap-2 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
              >
                Preferences &amp; Skills <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 6: JOB PREFERENCES ───────────────────────────────────── */}
        {currentStep === "preferences" && (
          <div className="space-y-4 text-xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight mb-1">
                Job Preferences &amp; Skills
              </h2>
              <p className="text-xs text-slate-500">
                Configure your search filters and verified skills baseline.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-slate-800 font-semibold">
                  Work Arrangement Preference
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {WORK_ARRANGEMENTS.map((arr) => (
                    <button
                      key={arr.id}
                      type="button"
                      onClick={() => setWorkArrangement(arr.id)}
                      className={`rounded-lg border p-2 text-left transition-all cursor-pointer ${
                        workArrangement === arr.id
                          ? "border-[#1d68ed] bg-[#f4f8ff] text-[#1d68ed] font-semibold shadow-xs"
                          : "border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <div className="font-medium text-xs">{arr.label}</div>
                      <div className="text-[10px] text-slate-400">{arr.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-800 font-semibold">
                  Core Skills &amp; Technologies (Comma-separated)
                </label>
                <textarea
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="e.g. TypeScript, React, Next.js, Node.js, PostgreSQL, Docker, AWS"
                  className="w-full h-20 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 text-xs focus:border-[#1d68ed] focus:bg-white focus:ring-2 focus:ring-[#1d68ed]/20 focus:outline-none resize-none leading-relaxed placeholder:text-slate-400"
                />
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">
                    Actively Job Searching
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Prioritize fresh postings and auto-computed match ranking in Job Radar.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={activelyLooking}
                  onChange={(e) => setActivelyLooking(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#1d68ed] focus:ring-[#1d68ed]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200/80 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setCurrentStep("target")}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setCurrentStep("workspace");
                }}
                className="flex items-center gap-2 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
              >
                Workspace Setup <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 7: WORKSPACE SETUP & LAUNCH ──────────────────────────── */}
        {currentStep === "workspace" && (
          <div className="space-y-4 text-xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight mb-1">
                Workspace Setup &amp; Launch
              </h2>
              <p className="text-xs text-slate-500">
                Confirm your isolated tenant workspace name. CareerOS separates all evidence by workspace.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-slate-800 font-semibold">Workspace Name</label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="e.g. Alex Morgan Career Hub"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 text-xs focus:border-[#1d68ed] focus:bg-white focus:ring-2 focus:ring-[#1d68ed]/20 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              {/* Summary card */}
              <div className="rounded-xl border border-slate-200/80 bg-[#f4f8ff] p-4 space-y-2">
                <div className="font-semibold text-slate-900">Summary of Configuration</div>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="text-slate-900 font-medium">Candidate:</span> {name}
                  </div>
                  <div>
                    <span className="text-slate-900 font-medium">Target Role:</span> {targetRole}
                  </div>
                  <div>
                    <span className="text-slate-900 font-medium">Industry:</span> {field}
                  </div>
                  <div>
                    <span className="text-slate-900 font-medium">Work Arrangement:</span>{" "}
                    {workArrangement}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200/80 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setCurrentStep("preferences")}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleComplete()}
                className="flex items-center gap-2 rounded-lg bg-[#1d68ed] hover:bg-[#1555c8] disabled:opacity-50 px-6 py-2.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Launching...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" /> Complete &amp; Enter CareerOS
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
