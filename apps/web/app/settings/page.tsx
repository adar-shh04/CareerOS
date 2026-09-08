import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ByokSettingsView } from "@/components/settings/byok-settings-view";
import { getServerSession } from "@/lib/server-session";

export default async function SettingsPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  if (session.needsOnboarding) {
    redirect("/onboarding");
  }

  return (
    <DashboardShell>
      <ByokSettingsView />
    </DashboardShell>
  );
}
