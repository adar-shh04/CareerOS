import type { SectionCoachingRequest } from "@repo/types";
import { NextResponse } from "next/server";

import { coachAiCoachSection } from "@/lib/api";
import { getBffSession, handleBffError } from "@/lib/bff";

export async function POST(request: Request) {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const body = (await request.json().catch(() => ({}))) as Partial<SectionCoachingRequest>;
    if (!body.section) {
      return NextResponse.json(
        { message: "section is required", statusCode: 400 },
        { status: 400 },
      );
    }
    const result = await coachAiCoachSection(
      session.token,
      session.workspace.id,
      body as SectionCoachingRequest,
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleBffError(error, "Failed to coach section.");
  }
}
