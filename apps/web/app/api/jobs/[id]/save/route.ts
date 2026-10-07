import { NextResponse } from "next/server";

import { saveJob } from "@/lib/api";
import { getBffSession, handleBffError } from "@/lib/bff";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const { id } = await params;
    const updatedJob = await saveJob(session.token, session.workspace.id, id);
    return NextResponse.json(updatedJob);
  } catch (error) {
    return handleBffError(error, "Failed to save job.");
  }
}
