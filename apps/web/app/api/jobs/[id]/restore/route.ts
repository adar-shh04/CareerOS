import { NextResponse } from "next/server";

import { restoreJob } from "@/lib/api";
import { getServerSession } from "@/lib/server-session";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const updatedJob = await restoreJob(
      session.token,
      session.workspace.id,
      id,
    );
    return NextResponse.json(updatedJob);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to restore job.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
