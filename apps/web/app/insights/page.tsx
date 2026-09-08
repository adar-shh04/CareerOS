import { redirect } from "next/navigation";

import { MarketInsightsView } from "@/components/insights/market-insights-view";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getServerSession } from "@/lib/server-session";
export default async function InsightsPage() { if (!(await getServerSession())) redirect("/login"); return <WorkspaceShell><MarketInsightsView masterProfile={null} /></WorkspaceShell>; }
