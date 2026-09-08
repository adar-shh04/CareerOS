import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { JobBoard } from "@/components/jobs/job-board";
import { getServerSession } from "@/lib/server-session";

export default async function SavedJobsPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  if (session.needsOnboarding) {
    redirect("/onboarding");
  }

  return (
    <DashboardShell>
      <JobBoard initialSavedOnly={true} />
    </DashboardShell>
  );
}
