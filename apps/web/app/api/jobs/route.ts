import { NextResponse } from "next/server";

import type { ListJobsParams } from "@/lib/api";
import { listJobs } from "@/lib/api";
import { getServerSession } from "@/lib/server-session";

export async function GET(request: Request) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const params: ListJobsParams = {
      query: searchParams.get("query") ?? undefined,
      remoteOnly: searchParams.get("remoteOnly") === "true",
      skill: searchParams.get("skill") ?? undefined,
      limit: searchParams.has("limit")
        ? parseInt(searchParams.get("limit")!, 10)
        : undefined,
      offset: searchParams.has("offset")
        ? parseInt(searchParams.get("offset")!, 10)
        : undefined,
    };
    const jobs = await listJobs(session.token, session.workspace.id, params);
    return NextResponse.json(jobs);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to fetch job opportunities.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
