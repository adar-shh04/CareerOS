import { NextResponse } from "next/server";

import { fetchJobAnalysis } from "@/lib/api";
import { getBffSession, handleBffError } from "@/lib/bff";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  const { id: jobId } = await params;

  try {
    const analysis = await fetchJobAnalysis(
      session.token,
      session.workspace.id,
      jobId,
    );
    return NextResponse.json(analysis);
  } catch (error) {
    return handleBffError(error, "Failed to analyze job.");
  }
}
