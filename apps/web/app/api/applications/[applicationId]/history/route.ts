import { NextResponse } from "next/server";

import { ApiError, fetchApplicationHistory } from "@/lib/api";
import { getServerSession } from "@/lib/server-session";

interface RouteParams {
  params: Promise<{ applicationId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { applicationId } = await params;

  try {
    const history = await fetchApplicationHistory(
      session.token,
      session.workspace.id,
      applicationId,
    );
    return NextResponse.json(history);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Failed to load application history.";
    return NextResponse.json({ message }, { status });
  }
}
