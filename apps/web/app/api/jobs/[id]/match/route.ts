import type { JobMatchingWeights } from "@repo/types";
import { NextResponse } from "next/server";

import { triggerJobMatch } from "@/lib/api";
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
      weights?: Partial<JobMatchingWeights>;
    };
    const updatedJob = await triggerJobMatch(
      session.token,
      session.workspace.id,
      id,
      body,
    );

    return NextResponse.json(updatedJob);
  } catch (error) {
    return handleBffError(error, "Failed to run job matching.");
  }
}
