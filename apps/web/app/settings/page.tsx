import { redirect } from "next/navigation";

import { ByokSettingsView } from "@/components/settings/byok-settings-view";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getServerSession } from "@/lib/server-session";
export default async function SettingsPage() { if (!(await getServerSession())) redirect("/login"); return <WorkspaceShell><ByokSettingsView /></WorkspaceShell>; }
