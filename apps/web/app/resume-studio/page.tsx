import { redirect } from "next/navigation";

import { ResumeIntelligenceView } from "@/components/resume-intelligence/resume-intelligence-view";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getServerSession } from "@/lib/server-session";
export default async function ResumeStudioPage() { if (!(await getServerSession())) redirect("/login"); return <WorkspaceShell><ResumeIntelligenceView /></WorkspaceShell>; }
