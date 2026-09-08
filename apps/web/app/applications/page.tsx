import { redirect } from "next/navigation";

import { ApplicationTrackerView } from "@/components/applications/application-tracker-view";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getServerSession } from "@/lib/server-session";

export default async function ApplicationsPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  if (session.needsOnboarding) {
    redirect("/onboarding");
  }

  return (
    <DashboardShell>
      <ApplicationTrackerView />
    </DashboardShell>
  );
}
