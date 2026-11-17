import { NextResponse } from "next/server";

import { importJobFromUrl } from "@/lib/api";
import { getBffSession, handleBffError } from "@/lib/bff";

export async function POST(request: Request) {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      typeof body.url !== "string"
    ) {
      return NextResponse.json(
        { message: "A job posting URL is required." },
        { status: 400 },
      );
    }
    // Forward only the URL; the API validates it and fetches the page.
    const draft = await importJobFromUrl(
      session.token,
      session.workspace.id,
      body.url,
    );
    return NextResponse.json(draft);
  } catch (error) {
    return handleBffError(error, "Unable to import this job posting.");
  }
}
