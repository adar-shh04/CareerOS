import { redirect } from "next/navigation";

import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getServerSession } from "@/lib/server-session";
export default async function CareerProfilePage() { if (!(await getServerSession())) redirect("/login"); return <WorkspaceShell />; }
