import { NextResponse } from "next/server";

import { fetchApplicationHistory } from "@/lib/api";
import { getBffSession, handleBffError } from "@/lib/bff";

interface RouteParams {
  params: Promise<{ applicationId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  const { applicationId } = await params;

  try {
    const history = await fetchApplicationHistory(
      session.token,
      session.workspace.id,
      applicationId,
    );
    return NextResponse.json(history);
  } catch (error) {
    return handleBffError(error, "Failed to load application history.");
  }
}
