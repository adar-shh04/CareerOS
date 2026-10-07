import type { AnalyzeRoleRequest } from "@repo/types";
import { NextResponse } from "next/server";

import { analyzeAiCoachRole } from "@/lib/api";
import { getBffSession, handleBffError } from "@/lib/bff";

export async function POST(request: Request) {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const body = (await request.json().catch(() => ({}))) as AnalyzeRoleRequest;
    const analysis = await analyzeAiCoachRole(
      session.token,
      session.workspace.id,
      body,
    );
    return NextResponse.json(analysis);
  } catch (error) {
    return handleBffError(error, "Failed to run AI coach analysis.");
  }
}
