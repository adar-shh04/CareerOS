import { NextResponse } from "next/server";

import { ApiError, fetchJobAnalysis } from "@/lib/api";
import { getServerSession } from "@/lib/server-session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id: jobId } = await params;

  try {
    const analysis = await fetchJobAnalysis(
      session.token,
      session.workspace.id,
      jobId,
    );
    return NextResponse.json(analysis);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Failed to analyze job.";
    return NextResponse.json({ message }, { status });
  }
}
