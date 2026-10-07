import { NextResponse } from "next/server";

import { getJob } from "@/lib/api";
import { getBffSession, handleBffError } from "@/lib/bff";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const { id } = await params;
    const job = await getJob(session.token, session.workspace.id, id);
    return NextResponse.json(job);
  } catch (error) {
    return handleBffError(error, "Failed to load job details.");
  }
}
