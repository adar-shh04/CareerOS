import type { ApplySectionRecommendationRequest } from "@repo/types";
import { NextResponse } from "next/server";

import { ApiError, applyAiCoachSection } from "@/lib/api";
import { getServerSession } from "@/lib/server-session";

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Partial<ApplySectionRecommendationRequest>;
    if (!body.resumeProfileId || !body.section) {
      return NextResponse.json(
        { message: "resumeProfileId and section are required" },
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
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error
        ? error.message
        : "Failed to apply section recommendation.";
    return NextResponse.json({ message }, { status });
  }
}
