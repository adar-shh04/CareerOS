import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ResumeStudioOverview } from "@/components/resumes/resume-studio-overview";
import { getServerSession } from "@/lib/server-session";

export default async function ResumesPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  if (session.needsOnboarding) {
    redirect("/onboarding");
  }

  return (
    <DashboardShell>
      <ResumeStudioOverview />
    </DashboardShell>
  );
}
