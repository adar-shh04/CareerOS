import type { CreateResumeVersionInput } from "@repo/types";
import { NextResponse } from "next/server";

import { createResumeVersion, listResumeVersions } from "@/lib/api";
import { getBffSession, handleBffError } from "@/lib/bff";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  const { profileId } = await params;

  try {
    const versions = await listResumeVersions(
      session.token,
      session.workspace.id,
      profileId,
    );
    return NextResponse.json(versions);
  } catch (error) {
    return handleBffError(error, "Unable to list resume versions.");
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  const { profileId } = await params;

  try {
    const body = (await request.json()) as CreateResumeVersionInput;
    const created = await createResumeVersion(
      session.token,
      session.workspace.id,
      profileId,
      body,
    );
    return NextResponse.json(created);
  } catch (error) {
    return handleBffError(error, "Unable to create resume version.");
  }
}
