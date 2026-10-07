import type { MasterCareerProfileInput } from "@repo/types";
import { NextResponse } from "next/server";

import { fetchCareerProfile, saveCareerProfile } from "@/lib/api";
import { getBffSession, handleBffError } from "@/lib/bff";

export async function GET() {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const profile = await fetchCareerProfile(
      session.token,
      session.workspace.id,
    );

    return NextResponse.json(profile);
  } catch (error) {
    return handleBffError(error, "Unable to fetch career profile.");
  }
}

export async function PUT(request: Request) {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const body = (await request.json()) as MasterCareerProfileInput;
    const updated = await saveCareerProfile(
      session.token,
      session.workspace.id,
      body,
    );
    return NextResponse.json(updated);
  } catch (error) {
    return handleBffError(error, "Unable to save career profile.");
  }
}
