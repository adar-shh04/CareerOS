import { redirect } from "next/navigation";

import { JobBoard } from "@/components/jobs/job-board";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getServerSession } from "@/lib/server-session";

export default async function JobsPage() {
  if (!(await getServerSession())) redirect("/login");
  return <WorkspaceShell><JobBoard /></WorkspaceShell>;
}
