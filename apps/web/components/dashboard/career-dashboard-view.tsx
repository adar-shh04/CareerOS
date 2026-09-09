"use client";

import { ChevronRight, User } from "lucide-react";
import Link from "next/link";
import React from "react";

import {
  ApplicationActivity,
  type ApplicationActivityItem,
} from "./application-activity";
import {
  CareerInsightsCard,
  type InsightTopic,
} from "./career-insights-card";
import { CareerSnapshot } from "./career-snapshot";
import {
  type JobMatchItem,
  JobRadarPreview,
} from "./job-radar-preview";
import {
  type ActionChecklistItem,
  NextBestAction,
} from "./next-best-action";

/* ────────────────────────────────────────────────────────────────────────── */
/*  Domain Types & Interfaces                                                */
/* ────────────────────────────────────────────────────────────────────────── */

export interface UserGreetingData {
  name: string;
  timeOfDayGreeting: string;
  headlineSummary: string;
}

export interface CareerDashboardProps {
  greeting?: UserGreetingData;
  profileReadiness?: number;
  newJobsCount?: number;
  activeAppsCount?: number;
  interviewsCount?: number;
  nextInterviewDate?: string;
  checklistItems?: ActionChecklistItem[];
  jobMatches?: JobMatchItem[];
  applicationActivities?: ApplicationActivityItem[];
  careerInsights?: InsightTopic[];
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Realistic Mock Data (Matching Reference Screenshot)                     */
/* ────────────────────────────────────────────────────────────────────────── */

const DEFAULT_GREETING: UserGreetingData = {
  name: "Adarsh",
  timeOfDayGreeting: "Good morning",
  headlineSummary:
    "Your application to Vandelay is progressing well. Review 3 new matching roles and your profile health below.",
};

const DEFAULT_CHECKLIST: ActionChecklistItem[] = [
  { id: "personal", label: "Personal details", completed: true },
  { id: "education", label: "Education", completed: true },
  { id: "skills", label: "Skills & experience", completed: true },
  { id: "certifications", label: "Certifications", completed: false },
];

const DEFAULT_JOB_MATCHES: JobMatchItem[] = [
  {
    id: "hooli-da",
    role: "Senior Data Analyst",
    company: "Hooli",
    avatarChar: "H",
    location: "Seattle, WA",
    type: "Full-Time",
    matchPercentage: 92,
    posted: "2d ago",
    href: "/jobs",
  },
  {
    id: "initech-fe",
    role: "Frontend Engineer",
    company: "Initech",
    avatarChar: "I",
    location: "Remote",
    type: "Remote",
    matchPercentage: 85,
    posted: "4d ago",
    href: "/jobs",
  },
  {
    id: "omni-ml",
    role: "ML Engineer",
    company: "Omni Consumer Products",
    avatarChar: "O",
    location: "Detroit, MI",
    type: "Full-Time",
    matchPercentage: 89,
    posted: "1d ago",
    href: "/jobs",
  },
  {
    id: "vandelay-be",
    role: "Backend Developer",
    company: "Vandelay Industries",
    avatarChar: "V",
    location: "New York, NY",
    type: "Hybrid",
    matchPercentage: 82,
    posted: "3d ago",
    href: "/jobs",
  },
];

const DEFAULT_ACTIVITIES: ApplicationActivityItem[] = [
  {
    id: "act-vandelay",
    stage: "applied",
    stageLabel: "Applied",
    role: "Frontend Dev",
    company: "Vandelay",
    note: "(Initech, 1d ago)",
    date: "Mar 12, 2024",
    href: "/applications",
  },
  {
    id: "act-acme",
    stage: "applied",
    stageLabel: "Applied",
    role: "Frontend Dev",
    company: "Acme Corp",
    note: "(Initech, 1d ago)",
    date: "Mar 11, 2024",
    href: "/applications",
  },
  {
    id: "act-zenith",
    stage: "interview",
    stageLabel: "Interview Scheduled",
    role: "Senior SW Engineer",
    company: "Zenith Tech",
    note: "(Vandelay Industries, tomorrow)",
    date: "Mar 16, 2024",
    href: "/applications",
  },
  {
    id: "act-stellar",
    stage: "offer",
    stageLabel: "Offer Received",
    role: "SDE II",
    company: "Stellar Systems",
    note: "(Example, for layout)",
    date: "Mar 08, 2024",
    href: "/applications",
  },
];

const DEFAULT_INSIGHTS: InsightTopic[] = [
  {
    id: "ins-skills",
    icon: "chart",
    title: "Skills frequently appearing",
    description: "Kubernetes, Cloud Security, Terraform, Docker",
    href: "/insights",
  },
  {
    id: "ins-trends",
    icon: "trend",
    title: "Hiring trends",
    description: "Increased demand for Python in Data Science roles",
    href: "/insights",
  },
  {
    id: "ins-strengthen",
    icon: "target",
    title: "Skills to strengthen",
    description: "Product Management foundations",
    href: "/insights",
  },
];

/* ────────────────────────────────────────────────────────────────────────── */
/*  Main View Component                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

export function CareerDashboardView({
  greeting = DEFAULT_GREETING,
  profileReadiness = 88,
  newJobsCount = 3,
  activeAppsCount = 2,
  interviewsCount = 1,
  nextInterviewDate = "Next: Mar 16, 2024",
  checklistItems = DEFAULT_CHECKLIST,
  jobMatches = DEFAULT_JOB_MATCHES,
  applicationActivities = DEFAULT_ACTIVITIES,
  careerInsights = DEFAULT_INSIGHTS,
}: CareerDashboardProps) {
  return (
    <div className="space-y-6">
      {/* ── Top Greeting Section ───────────────────────────────────── */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {greeting.timeOfDayGreeting}, {greeting.name}
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm max-w-2xl leading-relaxed">
            {greeting.headlineSummary}
          </p>
        </div>

        <div className="shrink-0">
          <Link
            href="/career"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1d68ed] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition-all hover:bg-[#1555c8] active:scale-[0.98]"
          >
            <User className="h-4 w-4" />
            <span>Update profile</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Career Snapshot Metrics Bar ────────────────────────────── */}
      <CareerSnapshot
        profileReadiness={profileReadiness}
        newJobsCount={newJobsCount}
        newJobsDelta="+3 since last 24h"
        activeAppsCount={activeAppsCount}
        activeAppsDelta="+1 since last 7 days"
        interviewsCount={interviewsCount}
        nextInterviewDate={nextInterviewDate}
      />

      {/* ── 2-Column Split: Main Content (8 cols) & Right Widgets (4 cols) ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (8 cols): Next Best Action & Job Radar Preview */}
        <div className="flex flex-col gap-6 lg:col-span-8">
          <NextBestAction
            title="Complete your Career Profile"
            description="Add your certifications to boost your match accuracy with target roles. This will help you get better recommendations and increase your interview chances."
            completenessPercentage={profileReadiness}
            ctaText="Add certifications"
            ctaHref="/career"
            items={checklistItems}
          />

          <JobRadarPreview jobs={jobMatches} />
        </div>

        {/* Right Column (4 cols): Application Activity & Career Insights */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          <ApplicationActivity items={applicationActivities} />

          <CareerInsightsCard insights={careerInsights} />
        </div>
      </div>
    </div>
  );
}
