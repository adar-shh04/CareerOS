import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AccountSettingsView } from "@/components/settings/account-settings-view";
import { getServerSession } from "@/lib/server-session";

export default async function SettingsPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  if (session.needsOnboarding) {
    redirect("/onboarding");
  }

  const displayName =
    session.user.name ?? session.user.email.split("@")[0] ?? "User";

  return (
    <DashboardShell
      breadcrumb="Account & Settings"
      userName={displayName}
      userRole={`(${session.workspace.name})`}
    >
      <AccountSettingsView
        userName={displayName}
        userEmail={session.user.email}
        workspaceName={session.workspace.name}
        workspaceSlug={session.workspace.slug}
      />
    </DashboardShell>
  );
}
