import { NextResponse } from "next/server";

import { ApiError, fetchResumeVersion } from "@/lib/api";
import { getServerSession } from "@/lib/server-session";

interface RouteParams {
  params: Promise<{ profileId: string; versionId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

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
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Failed to load resume version.";
    return NextResponse.json({ message }, { status });
  }
}
