import { redirect } from "next/navigation";

import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getServerSession } from "@/lib/server-session";
export default async function ResumeStudioPage() { if (!(await getServerSession())) redirect("/login"); return <WorkspaceShell />; }
