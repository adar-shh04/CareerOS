import { NextResponse } from "next/server";

import { createTargetedResumeForJob } from "@/lib/api";
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
    };
    const result = await createTargetedResumeForJob(
      session.token,
      session.workspace.id,
      id,
      body,
    );

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create targeted resume version.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
