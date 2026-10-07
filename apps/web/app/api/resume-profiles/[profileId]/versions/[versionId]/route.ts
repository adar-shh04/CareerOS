import { NextResponse } from "next/server";

import { fetchResumeVersion } from "@/lib/api";
import { getBffSession, handleBffError } from "@/lib/bff";

interface RouteParams {
  params: Promise<{ profileId: string; versionId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  const { profileId, versionId } = await params;

  try {
    const version = await fetchResumeVersion(
      session.token,
      session.workspace.id,
      profileId,
      versionId,
    );
    return NextResponse.json(version);
  } catch (error) {
    return handleBffError(error, "Failed to load resume version.");
  }
}
