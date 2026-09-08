import { redirect } from "next/navigation";

import { ApplicationTrackerView } from "@/components/applications/application-tracker-view";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getServerSession } from "@/lib/server-session";
export default async function ApplicationsPage() { if (!(await getServerSession())) redirect("/login"); return <WorkspaceShell><ApplicationTrackerView /></WorkspaceShell>; }
