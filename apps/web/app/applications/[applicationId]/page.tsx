import { redirect } from "next/navigation";

import { ApplicationDetailView } from "@/components/applications/application-detail-view";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getServerSession } from "@/lib/server-session";

interface PageProps {
  params: Promise<{ applicationId: string }>;
}

export default async function ApplicationDetailPage({ params }: PageProps) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  if (session.needsOnboarding) {
    redirect("/onboarding");
  }

  const { applicationId } = await params;

  return (
    <DashboardShell>
      <ApplicationDetailView applicationId={applicationId} />
    </DashboardShell>
  );
}
