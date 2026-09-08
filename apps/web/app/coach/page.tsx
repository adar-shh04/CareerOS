import { redirect } from "next/navigation";

import { AICoachView } from "@/components/ai-coach/ai-coach-view";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getServerSession } from "@/lib/server-session";

export default async function AICoachPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  if (session.needsOnboarding) {
    redirect("/onboarding");
  }

  return (
    <DashboardShell>
      <AICoachView />
    </DashboardShell>
  );
}
