import type { JobMatchingWeights } from "@repo/types";
import { NextResponse } from "next/server";

import { triggerJobMatch } from "@/lib/api";
import { getServerSession } from "@/lib/server-session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

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
    const message =
      error instanceof Error ? error.message : "Failed to run job matching.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
