import { NextResponse } from "next/server";

import { fetchResumeVersionSelectionReview } from "@/lib/api";
import { getBffSession, handleBffError } from "@/lib/bff";

interface RouteParams {
  params: Promise<{ profileId: string; versionId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  const { profileId, versionId } = await params;

  try {
    const review = await fetchResumeVersionSelectionReview(
      session.token,
      session.workspace.id,
      profileId,
      versionId,
    );
    return NextResponse.json(review);
  } catch (error) {
    return handleBffError(error, "Unable to load the selection review.");
  }
}
