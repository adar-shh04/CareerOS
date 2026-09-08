import { redirect } from "next/navigation";

import { CareerProfileView } from "@/components/career/career-profile-view";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getServerSession } from "@/lib/server-session";

export default async function CareerProfilePage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  if (session.needsOnboarding) {
    redirect("/onboarding");
  }

  return (
    <DashboardShell>
      <CareerProfileView />
    </DashboardShell>
  );
}
