import { NextResponse } from "next/server";

import type { ListJobsParams } from "@/lib/api";
import { listJobs } from "@/lib/api";
import { getBffSession, handleBffError } from "@/lib/bff";

export async function GET(request: Request) {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");
    const params: ListJobsParams = {
      query: searchParams.get("query") ?? undefined,
      remoteOnly: searchParams.get("remoteOnly") === "true",
      skill: searchParams.get("skill") ?? undefined,
      savedOnly: searchParams.get("savedOnly") === "true",
      hideDismissed: searchParams.get("hideDismissed") === "true",
      limit: limitParam ? parseInt(limitParam, 10) : undefined,
      offset: offsetParam ? parseInt(offsetParam, 10) : undefined,
    };
    const jobs = await listJobs(session.token, session.workspace.id, params);
    return NextResponse.json(jobs);
  } catch (error) {
    return handleBffError(error, "Unable to fetch job opportunities.");
  }
}
