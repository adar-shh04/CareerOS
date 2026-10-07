import type { ResumeProfileInput } from "@repo/types";
import { NextResponse } from "next/server";

import { createResumeProfile, listResumeProfiles } from "@/lib/api";
import { getBffSession, handleBffError } from "@/lib/bff";

export async function GET() {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const profiles = await listResumeProfiles(session.token, session.workspace.id);
    return NextResponse.json(profiles);
  } catch (error) {
    return handleBffError(error, "Unable to list resume profiles.");
  }
}

export async function POST(request: Request) {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const body = (await request.json()) as ResumeProfileInput;
    const created = await createResumeProfile(
      session.token,
      session.workspace.id,
      body,
    );
    return NextResponse.json(created);
  } catch (error) {
    return handleBffError(error, "Unable to create resume profile.");
  }
}
