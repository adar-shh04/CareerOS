import type { SectionCoachingRequest } from "@repo/types";
import { NextResponse } from "next/server";

import { ApiError, coachAiCoachSection } from "@/lib/api";
import { getServerSession } from "@/lib/server-session";

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Partial<SectionCoachingRequest>;
    if (!body.section) {
      return NextResponse.json(
        { message: "section is required" },
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
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Failed to coach section.";
    return NextResponse.json({ message }, { status });
  }
}
