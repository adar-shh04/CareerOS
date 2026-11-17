import { NextResponse } from "next/server";

import type { ListJobsParams } from "@/lib/api";
import { createManualJob, listJobs } from "@/lib/api";
import { getBffSession, handleBffError } from "@/lib/bff";

export async function POST(request: Request) {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { message: "A JSON job object is required." },
        { status: 400 },
      );
    }
    // Forward only the user-editable fields; the API validates them and
    // rejects anything else (owner / source cannot be client-supplied).
    const input = {
      title: body.title,
      company: body.company,
      description: body.description,
      location: body.location,
      isRemote: body.isRemote,
      salaryRange: body.salaryRange,
      sourceUrl: body.sourceUrl,
    } as Parameters<typeof createManualJob>[2];
    const result = await createManualJob(
      session.token,
      session.workspace.id,
      input,
    );
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    return handleBffError(error, "Unable to add this job.");
  }
}

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
