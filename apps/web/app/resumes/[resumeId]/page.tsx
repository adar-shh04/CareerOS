import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ResumeProfileWorkspace } from "@/components/resumes/resume-profile-workspace";
import { getServerSession } from "@/lib/server-session";

interface PageProps {
  params: Promise<{ resumeId: string }>;
}

export default async function ResumeProfilePage({ params }: PageProps) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  if (session.needsOnboarding) {
    redirect("/onboarding");
  }

  const { resumeId } = await params;

  return (
    <DashboardShell>
      <ResumeProfileWorkspace profileId={resumeId} />
    </DashboardShell>
  );
}
