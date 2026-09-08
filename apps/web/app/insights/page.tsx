import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { MarketInsightsView } from "@/components/insights/market-insights-view";
import { getServerSession } from "@/lib/server-session";

export default async function InsightsPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  if (session.needsOnboarding) {
    redirect("/onboarding");
  }

  return (
    <DashboardShell>
      <MarketInsightsView />
    </DashboardShell>
  );
}
