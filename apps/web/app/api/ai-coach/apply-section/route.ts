import type { ApplySectionRecommendationRequest } from "@repo/types";
import { NextResponse } from "next/server";

import { applyAiCoachSection } from "@/lib/api";
import { getBffSession, handleBffError } from "@/lib/bff";

export async function POST(request: Request) {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const body = (await request.json().catch(() => ({}))) as Partial<ApplySectionRecommendationRequest>;
    if (!body.resumeProfileId || !body.section) {
      return NextResponse.json(
        { message: "resumeProfileId and section are required", statusCode: 400 },
        { status: 400 },
      );
    }
    const result = await applyAiCoachSection(
      session.token,
      session.workspace.id,
      body as ApplySectionRecommendationRequest,
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleBffError(error, "Failed to apply section recommendation.");
  }
}
