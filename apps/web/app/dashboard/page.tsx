import { redirect } from "next/navigation";

import CareerCommandCenter from "../../components/dashboard/career-command-center";
import { WorkspaceShell } from "../../components/workspace/workspace-shell";
import { getServerSession } from "../../lib/server-session";

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return <WorkspaceShell><CareerCommandCenter /></WorkspaceShell>;
}
