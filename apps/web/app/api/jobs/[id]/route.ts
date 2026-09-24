import { NextResponse } from "next/server";

import { ApiError, getJob } from "@/lib/api";
import { getServerSession } from "@/lib/server-session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const job = await getJob(session.token, session.workspace.id, id);
    return NextResponse.json(job);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Failed to load job details.";
    return NextResponse.json({ message }, { status });
  }
}
