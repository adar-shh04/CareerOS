import { redirect } from "next/navigation";

import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { ProfileView } from "@/components/workspace/workspace-views";
import { getServerSession } from "@/lib/server-session";
export default async function CareerProfilePage() { if (!(await getServerSession())) redirect("/login"); return <WorkspaceShell><ProfileView /></WorkspaceShell>; }
