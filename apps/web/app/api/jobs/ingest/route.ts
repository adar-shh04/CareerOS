import { NextResponse } from "next/server";

import { ingestJobs } from "@/lib/api";
import { getServerSession } from "@/lib/server-session";

export async function POST(request: Request) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      query?: string;
      location?: string;
      limit?: number;
      source?: string;
    };
    const result = await ingestJobs(
      session.token,
      session.workspace.id,
      body,
    );

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to trigger job ingestion.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
