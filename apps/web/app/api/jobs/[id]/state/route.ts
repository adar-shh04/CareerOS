import type { WorkspaceJobStatus } from "@repo/types";
import { NextResponse } from "next/server";

import { updateJobState } from "@/lib/api";
import { getBffSession, handleBffError } from "@/lib/bff";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      status?: WorkspaceJobStatus;
      isSaved?: boolean;
      isDismissed?: boolean;
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
    return handleBffError(error, "Failed to update job state.");
  }
}
