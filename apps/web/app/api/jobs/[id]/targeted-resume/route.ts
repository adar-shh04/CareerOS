import { NextResponse } from "next/server";

import { createTargetedResumeForJob } from "@/lib/api";
import { getBffSession, handleBffError } from "@/lib/bff";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      resumeProfileId?: string;
    };
    const result = await createTargetedResumeForJob(
      session.token,
      session.workspace.id,
      id,
      body,
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleBffError(error, "Failed to create targeted resume version.");
  }
}
