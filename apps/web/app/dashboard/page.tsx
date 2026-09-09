import { redirect } from "next/navigation";
import React from "react";

import { CareerDashboardView } from "@/components/dashboard/career-dashboard-view";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  ApiError,
  fetchApplications,
  fetchCareerHandbook,
  fetchCareerProfile,
  listJobs,
} from "@/lib/api";
import { getServerSession } from "@/lib/server-session";

export default async function DashboardPage() {
  const session = await getServerSession();

  // Enforce Better Auth session guard across all environments
  if (!session) {
    redirect("/login");
  }

  // Redirect to onboarding if user profile is incomplete
  if (session.needsOnboarding) {
    redirect("/onboarding");
  }

  const displayName =
    session.user.name ??
    session.user.email.split("@")[0] ??
    "Member";

  // Real initial data fetching scoped to authenticated workspace
  let initialProfile = null;
  let initialJobs: Awaited<ReturnType<typeof listJobs>> = [];
  let initialApplications: Awaited<ReturnType<typeof fetchApplications>> = [];
  let initialHandbook: Awaited<ReturnType<typeof fetchCareerHandbook>> | null = null;

  try {
    const [profileResult, jobsResult, appsResult, handbookResult] =
      await Promise.allSettled([
        fetchCareerProfile(session.token, session.workspace.id),
        listJobs(session.token, session.workspace.id, { limit: 6 }),
        fetchApplications(session.token, session.workspace.id),
        fetchCareerHandbook(session.token, session.workspace.id),
      ]);

    // If an authentication failure occurred (401), force re-login
    const results = [profileResult, jobsResult, appsResult, handbookResult];
    for (const res of results) {
      if (
        res.status === "rejected" &&
        res.reason instanceof ApiError &&
        res.reason.status === 401
      ) {
        redirect("/login");
      }
    }

    if (profileResult.status === "fulfilled") {
      initialProfile = profileResult.value;
    }
    if (jobsResult.status === "fulfilled") {
      initialJobs = jobsResult.value;
    }
    if (appsResult.status === "fulfilled") {
      initialApplications = appsResult.value;
    }
    if (handbookResult.status === "fulfilled") {
      initialHandbook = handbookResult.value;
    }
  } catch (err) {
    console.error("Dashboard initial data fetch error:", err);
  }

  return (
    <DashboardShell
      breadcrumb="Command Center"
      userName={displayName}
      userRole={`(${session.workspace.name})`}
    >
      <CareerDashboardView
        initialProfile={initialProfile}
        initialJobs={initialJobs}
        initialApplications={initialApplications}
        initialHandbook={initialHandbook}
        userName={displayName}
      />
    </DashboardShell>
  );
}
