import type { ResumeProfileInput } from "@repo/types";
import { NextResponse } from "next/server";

import { ApiError, createResumeProfile, listResumeProfiles } from "@/lib/api";
import { getServerSession } from "@/lib/server-session";

export async function GET() {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const profiles = await listResumeProfiles(session.token, session.workspace.id);
    return NextResponse.json(profiles);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Unable to list resume profiles.";
    return NextResponse.json({ message }, { status });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as ResumeProfileInput;
    const created = await createResumeProfile(
      session.token,
      session.workspace.id,
      body,
    );
    return NextResponse.json(created);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Unable to create resume profile.";
    return NextResponse.json({ message }, { status });
  }
}
