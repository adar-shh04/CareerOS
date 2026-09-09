"use client";

import type {
  CareerHandbookResponse,
  JobOpportunity,
  MasterCareerProfile,
} from "@repo/types";
import { ChevronRight, User } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";

import type { TrackedApplication } from "@/lib/api";

import { ApplicationActivity } from "./application-activity";
import {
  CareerInsightsCard,
  type HandbookHighlight,
  type MarketSkillDemand,
} from "./career-insights-card";
import { CareerSnapshot } from "./career-snapshot";
import { JobRadarPreview } from "./job-radar-preview";
import { NextBestAction } from "./next-best-action";

export interface CareerDashboardProps {
  initialProfile?: MasterCareerProfile | null;
  initialJobs?: JobOpportunity[];
  initialApplications?: TrackedApplication[];
  initialHandbook?: CareerHandbookResponse | null;
  userName?: string;
}

export function CareerDashboardView({
  initialProfile = null,
  initialJobs = [],
  initialApplications = [],
  initialHandbook = null,
  userName = "Member",
}: CareerDashboardProps) {
  const [profile, setProfile] = useState<MasterCareerProfile | null>(
    initialProfile,
  );
  const [jobs, setJobs] = useState<JobOpportunity[]>(initialJobs);
  const [applications, setApplications] = useState<TrackedApplication[]>(
    initialApplications,
  );
  const [handbookHighlights, setHandbookHighlights] = useState<
    HandbookHighlight[]
  >(
    initialHandbook
      ? initialHandbook.careerPaths.slice(0, 3).map((p) => ({
          title: p.title,
          category: "Career Pathway",
          href: `/insights#${p.fieldId}`,
        }))
      : [],
  );
  const [loading, setLoading] = useState(
    !initialProfile && initialJobs.length === 0 && !initialHandbook,
  );

  // Client data fetch if not provided via initial server props
  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      try {
        const promises: Promise<unknown>[] = [];

        if (!initialHandbook) {
          promises.push(
            fetch("/api/insights/handbook")
              .then((r) =>
                r.ok ? (r.json() as Promise<CareerHandbookResponse>) : null,
              )
              .then((data) => {
                if (isMounted && data) {
                  setHandbookHighlights(
                    data.careerPaths.slice(0, 3).map((p) => ({
                      title: p.title,
                      category: "Career Pathway",
                      href: `/insights#${p.fieldId}`,
                    })),
                  );
                }
              }),
          );
        }

        if (!initialProfile && initialJobs.length === 0) {
          promises.push(
            fetch("/api/career-profile")
              .then((r) => (r.ok ? r.json() : null))
              .then((data) => {
                if (isMounted && data) {
                  setProfile(data as MasterCareerProfile);
                }
              }),
            fetch("/api/jobs?limit=6")
              .then((r) => (r.ok ? r.json() : []))
              .then((data) => {
                if (isMounted && Array.isArray(data)) {
                  setJobs(data as JobOpportunity[]);
                }
              }),
            fetch("/api/applications")
              .then((r) => (r.ok ? r.json() : []))
              .then((data) => {
                if (isMounted && Array.isArray(data)) {
                  setApplications(data as TrackedApplication[]);
                }
              }),
          );
        }

        if (promises.length > 0) {
          await Promise.allSettled(promises);
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [initialHandbook, initialProfile, initialJobs.length]);

  // Deterministic Career Readiness Calculation
  const { profileReadiness, checklistItems } = useMemo(() => {
    if (!profile) {
      return {
        profileReadiness: 0,
        checklistItems: [
          { id: "personal", label: "Personal details", completed: false },
          { id: "education", label: "Education", completed: false },
          { id: "skills", label: "Skills & experience", completed: false },
          { id: "certifications", label: "Certifications", completed: false },
        ],
      };
    }

    const hasIdentity =
      profile.identity.fullName.trim().length > 0 &&
      (profile.identity.headline?.trim().length ?? 0) > 0;
    const hasEducation = profile.education.length > 0;
    const hasExperience = profile.experiences.length > 0;
    const hasSkills = profile.skills.length > 0;
    const hasCertifications = profile.certifications.length > 0;

    let score = 0;
    if (hasIdentity) score += 25;
    if (hasEducation) score += 25;
    if (hasExperience) score += 25;
    if (hasSkills) score += 15;
    if (hasCertifications) score += 10;

    return {
      profileReadiness: score,
      checklistItems: [
        { id: "personal", label: "Personal details", completed: hasIdentity },
        { id: "education", label: "Education", completed: hasEducation },
        {
          id: "skills",
          label: "Skills & experience",
          completed: hasSkills && hasExperience,
        },
        {
          id: "certifications",
          label: "Certifications",
          completed: hasCertifications,
        },
      ],
    };
  }, [profile]);

  // Deterministic Next Best Action Prioritization
  const nextBestAction = useMemo(() => {
    if (!profile || profileReadiness < 100) {
      const missing = checklistItems.find((item) => !item.completed);
      if (missing?.id === "personal") {
        return {
          title: "Complete Career Identity",
          description:
            "Add your full name, headline, and location to establish your canonical career evidence baseline.",
          ctaText: "Edit Identity",
          ctaHref: "/career",
        };
      }
      if (missing?.id === "education") {
        return {
          title: "Add Education & Degrees",
          description:
            "Record your degrees, institutions, and graduation years to satisfy baseline role requirements.",
          ctaText: "Add Education",
          ctaHref: "/career",
        };
      }
      if (missing?.id === "skills") {
        return {
          title: "Add Skills & Work Experience",
          description:
            "Document your past roles and core technical skills to power deterministic job match scoring.",
          ctaText: "Add Experience",
          ctaHref: "/career",
        };
      }
      return {
        title: "Add Your Certifications",
        description:
          "Record certifications to demonstrate verified domain knowledge and increase interview match confidence.",
        ctaText: "Add Certifications",
        ctaHref: "/career",
      };
    }

    if (jobs.length > 0 && applications.length === 0) {
      return {
        title: "Apply to Top Matched Opportunities",
        description: `You have ${String(jobs.length)} matching job(s) available on your Job Radar. Review matches and track your first submission.`,
        ctaText: "Review Matches",
        ctaHref: "/jobs",
      };
    }

    if (applications.length > 0) {
      return {
        title: "Manage Application Pipeline",
        description: `You are tracking ${String(applications.length)} application(s). Review stage updates, record interview notes, and stay organized.`,
        ctaText: "View Pipeline",
        ctaHref: "/applications",
      };
    }

    return {
      title: "Explore Live Job Radar",
      description:
        "Your Master Career Profile is complete. Discover opportunities deterministically matched against your competencies.",
      ctaText: "Open Job Radar",
      ctaHref: "/jobs",
    };
  }, [profile, profileReadiness, checklistItems, jobs.length, applications.length]);

  // Deterministic Live Market Skill Demand from real active jobs
  const marketSkills: MarketSkillDemand[] = useMemo(() => {
    const counts = new Map<string, number>();
    for (const job of jobs) {
      for (const skill of job.requiredSkills) {
        const trimmed = skill.trim();
        if (trimmed) {
          counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
        }
      }
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [jobs]);

  // Interviews and screens count
  const interviewsCount = useMemo(() => {
    return applications.filter(
      (a) => a.status === "interview" || a.status === "screening",
    ).length;
  }, [applications]);

  // Time-of-day greeting (hydration-safe)
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  return (
    <div className="space-y-6">
      {/* ── Top Greeting Section ───────────────────────────────────── */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {greeting}, {userName}
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm max-w-2xl leading-relaxed">
            Here&apos;s what&apos;s happening with your career.
          </p>
        </div>

        <div className="shrink-0">
          <Link
            href="/career"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1d68ed] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition-all hover:bg-[#1555c8] active:scale-[0.98]"
          >
            <User className="h-4 w-4" />
            <span>Update profile</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── 4-Tile Telemetry Strip ─────────────────────────────────── */}
      <CareerSnapshot
        loading={loading}
        profileReadiness={profileReadiness}
        newJobsCount={jobs.length}
        activeAppsCount={applications.length}
        interviewsCount={interviewsCount}
      />

      {/* ── Responsive Bento Grid ──────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left Column (8 cols on xl+): Hero Readiness Card & Job Radar Preview */}
        <div className="flex flex-col gap-6 xl:col-span-8">
          <NextBestAction
            loading={loading}
            title={nextBestAction.title}
            description={nextBestAction.description}
            completenessPercentage={profileReadiness}
            ctaText={nextBestAction.ctaText}
            ctaHref={nextBestAction.ctaHref}
            items={checklistItems}
          />

          <JobRadarPreview loading={loading} jobs={jobs} />
        </div>

        {/* Right Column (4 cols on xl+): Application Activity & Market Intelligence */}
        <div className="flex flex-col gap-6 xl:col-span-4">
          <ApplicationActivity
            loading={loading}
            applications={applications}
          />

          <CareerInsightsCard
            loading={loading}
            marketSkills={marketSkills}
            handbookHighlights={handbookHighlights}
          />
        </div>
      </div>
    </div>
  );
}
