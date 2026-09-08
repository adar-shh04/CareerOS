import type { AnalyzeRoleRequest } from "@repo/types";
import { NextResponse } from "next/server";

import { analyzeAiCoachRole, ApiError } from "@/lib/api";
import { getServerSession } from "@/lib/server-session";

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as AnalyzeRoleRequest;
    const analysis = await analyzeAiCoachRole(
      session.token,
      session.workspace.id,
      body,
    );
    return NextResponse.json(analysis);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Failed to run AI coach analysis.";
    return NextResponse.json({ message }, { status });
  }
}
