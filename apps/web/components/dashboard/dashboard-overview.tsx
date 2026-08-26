"use client";

import type { JobOpportunity, MasterCareerProfile, ResumeProfile } from "@repo/types";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, FileText, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { DashboardShell } from "./dashboard-shell";

type LoadState<T> = { data: T | null; loading: boolean; error: boolean };

function StatCard({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof FileText }) {
  return <div className="rounded-lg border border-border bg-card p-5"><div className="flex items-center justify-between"><span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</span><Icon className="size-4 text-primary" /></div><p className="mt-5 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p></div>;
}

function DataState({ loading, error, empty, children }: { loading: boolean; error: boolean; empty: string; children: React.ReactNode }) {
  if (loading) return <div className="h-28 animate-pulse rounded-md bg-background" aria-label="Loading" />;
  if (error) return <p className="rounded-md border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">This data could not be loaded. Try again from the source workspace.</p>;
  if (empty) return <p className="rounded-md border border-dashed border-border bg-background p-4 text-sm leading-6 text-muted-foreground">{empty}</p>;
  return <>{children}</>;
}

export function DashboardOverview() {
  const [jobs, setJobs] = useState<LoadState<JobOpportunity[]>>({ data: null, loading: true, error: false });
  const [profile, setProfile] = useState<LoadState<MasterCareerProfile>>({ data: null, loading: true, error: false });
  const [resumeProfiles, setResumeProfiles] = useState<LoadState<ResumeProfile[]>>({ data: null, loading: true, error: false });

  useEffect(() => {
    const load = async <T,>(url: string, setState: (state: LoadState<T>) => void) => {
      try { const response = await fetch(url, { cache: "no-store" }); if (!response.ok) throw new Error("Request failed"); setState({ data: (await response.json()) as T, loading: false, error: false }); }
      catch { setState({ data: null, loading: false, error: true }); }
    };
    void load<JobOpportunity[]>("/api/jobs?limit=5", setJobs);
    void load<MasterCareerProfile>("/api/career-profile", setProfile);
    void load<ResumeProfile[]>("/api/resume-profiles", setResumeProfiles);
  }, []);

  const displayName = profile.data?.identity.fullName?.split(" ")[0] ?? "there";
  const profileReady = Boolean(profile.data);

  return <DashboardShell>
    <div className="flex flex-col gap-8">
      <section className="flex flex-col justify-between gap-5 border-b border-border pb-8 md:flex-row md:items-end">
        <div><p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Command center</p><h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Good to see you, {displayName}.</h1><p className="mt-3 max-w-2xl text-pretty text-sm leading-6 text-muted-foreground">Move from a source-of-truth profile to evidence-backed opportunities, targeted resume versions, and user-controlled applications.</p></div>
        <Link href="/jobs" className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90">Open Job Radar <ArrowRight className="size-4" /></Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Workspace overview">
        <StatCard label="Radar opportunities" value={jobs.loading ? "—" : jobs.error ? "—" : String(jobs.data?.length ?? 0)} detail={jobs.error ? "Unavailable right now" : "Current workspace results"} icon={BriefcaseBusiness} />
        <StatCard label="Career profile" value={profile.loading ? "—" : profileReady ? "Ready" : "Needed"} detail={profileReady ? "Source profile available" : "Add source data to match"} icon={UserRound} />
        <StatCard label="Resume profiles" value={resumeProfiles.loading ? "—" : resumeProfiles.error ? "—" : String(resumeProfiles.data?.length ?? 0)} detail={resumeProfiles.error ? "Unavailable right now" : "Reusable targeting directions"} icon={FileText} />
        <StatCard label="Applications" value="—" detail="Not exposed by the current API" icon={CheckCircle2} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-lg border border-border bg-card p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Next best action</p><h2 className="mt-2 text-xl font-semibold">Build your evidence loop</h2></div><span className="rounded-md bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">User controlled</span></div><div className="mt-6 flex flex-col gap-3"><Link href={profileReady ? "/jobs" : "/resume"} className="group flex items-center gap-4 rounded-md border border-border bg-background p-4 transition-colors hover:border-primary/60"><span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">{profileReady ? <BriefcaseBusiness className="size-4" /> : <Plus className="size-4" />}</span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{profileReady ? "Review matched opportunities" : "Create your Master Career Profile"}</span><span className="mt-1 block text-sm leading-6 text-muted-foreground">{profileReady ? "Inspect the evidence before choosing a role or resume direction." : "Your profile is the source used for matching and targeted versions."}</span></span><ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" /></Link><Link href="/resume" className="group flex items-center gap-4 rounded-md border border-border bg-background p-4 transition-colors hover:border-primary/60"><span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary"><FileText className="size-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">Inspect Resume Intelligence</span><span className="mt-1 block text-sm leading-6 text-muted-foreground">Keep profile edits separate from immutable generated versions.</span></span><ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" /></Link></div></div>
        <div className="rounded-lg border border-border bg-card p-5 sm:p-6"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Profile readiness</p><h2 className="mt-2 text-xl font-semibold">Source data</h2><div className="mt-6"><DataState loading={profile.loading} error={profile.error} empty={profileReady ? "" : "No career profile has been saved for this workspace yet."}>{<div className="flex flex-col gap-4 text-sm"><div><p className="text-muted-foreground">Identity</p><p className="mt-1 font-medium">{profile.data?.identity.fullName}</p></div><div><p className="text-muted-foreground">Headline</p><p className="mt-1 font-medium">{profile.data?.identity.headline ?? "Not provided"}</p></div><div><p className="text-muted-foreground">Profile version</p><p className="mt-1 font-medium">{profile.data?.version}</p></div></div>}</DataState></div></div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 sm:p-6"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Job Radar preview</p><h2 className="mt-2 text-xl font-semibold">Recent opportunities</h2></div><Link href="/jobs" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">View all <ArrowRight className="size-4" /></Link></div><div className="mt-6"><DataState loading={jobs.loading} error={jobs.error} empty={jobs.data?.length ? "" : "No opportunities are available yet. Open Job Radar to search or ingest workspace jobs."}>{<div className="flex flex-col divide-y divide-border">{jobs.data?.map((job) => <Link href="/jobs" key={job.id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate text-sm font-medium">{job.title}</p><p className="mt-1 truncate text-sm text-muted-foreground">{job.company} · {job.location ?? "Location not provided"}</p></div><ArrowRight className="size-4 shrink-0 text-muted-foreground" /></Link>)}</div>}</DataState></div></section>
    </div>
  </DashboardShell>;
}

export default DashboardOverview;
