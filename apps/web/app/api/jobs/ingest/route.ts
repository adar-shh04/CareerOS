import { NextResponse } from "next/server";

import { ingestJobs } from "@/lib/api";
import { getBffSession, handleBffError } from "@/lib/bff";

export async function POST(request: Request) {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

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
    return handleBffError(error, "Failed to trigger job ingestion.");
  }
}
