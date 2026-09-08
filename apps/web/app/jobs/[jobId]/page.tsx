import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { JobDetailPageView } from "@/components/jobs/job-detail-page-view";
import { getServerSession } from "@/lib/server-session";

interface PageProps {
  params: Promise<{ jobId: string }>;
}

export default async function JobDetailPage({ params }: PageProps) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  if (session.needsOnboarding) {
    redirect("/onboarding");
  }

  const { jobId } = await params;

  return (
    <DashboardShell>
      <JobDetailPageView jobId={jobId} />
    </DashboardShell>
  );
}
