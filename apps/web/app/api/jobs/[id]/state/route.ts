import type { WorkspaceJobStatus } from "@repo/types";
import { NextResponse } from "next/server";

import { updateJobState } from "@/lib/api";
import { getServerSession } from "@/lib/server-session";

export async function PATCH(
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
      status?: WorkspaceJobStatus;
      notes?: string;
      appliedAt?: string;
    };
    const updatedJob = await updateJobState(
      session.token,
      session.workspace.id,
      id,
      body,
    );
    return NextResponse.json(updatedJob);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update job state.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
