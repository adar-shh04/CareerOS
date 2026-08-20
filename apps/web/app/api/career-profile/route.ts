import type { MasterCareerProfileInput } from "@repo/types";
import { NextResponse } from "next/server";

import { ApiError, fetchCareerProfile, saveCareerProfile } from "@/lib/api";
import { getServerSession } from "@/lib/server-session";

export async function GET() {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const profile = await fetchCareerProfile(
      session.token,
      session.workspace.id,
    );

    return NextResponse.json(profile);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 400;
    const message =
      error instanceof Error
        ? error.message
        : "Unable to fetch career profile.";

    return NextResponse.json({ message }, { status });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as MasterCareerProfileInput;
    const updated = await saveCareerProfile(
      session.token,
      session.workspace.id,
      body,
    );
    return NextResponse.json(updated);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save career profile.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
