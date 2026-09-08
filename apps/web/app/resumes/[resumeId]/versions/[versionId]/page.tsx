import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ResumeVersionViewer } from "@/components/resumes/resume-version-viewer";
import { getServerSession } from "@/lib/server-session";

interface PageProps {
  params: Promise<{ resumeId: string; versionId: string }>;
}

export default async function ResumeVersionPage({ params }: PageProps) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  if (session.needsOnboarding) {
    redirect("/onboarding");
  }

  const { resumeId, versionId } = await params;

  return (
    <DashboardShell>
      <ResumeVersionViewer profileId={resumeId} versionId={versionId} />
    </DashboardShell>
  );
}
