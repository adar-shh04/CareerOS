import type { ResumeProfileInput } from "@repo/types";
import { NextResponse } from "next/server";

import {
  deleteResumeProfile,
  fetchResumeProfile,
  updateResumeProfile,
} from "@/lib/api";
import { getBffSession, handleBffError } from "@/lib/bff";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  const { profileId } = await params;

  try {
    const profile = await fetchResumeProfile(
      session.token,
      session.workspace.id,
      profileId,
    );
    return NextResponse.json(profile);
  } catch (error) {
    return handleBffError(error, "Unable to fetch resume profile.");
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  const { profileId } = await params;

  try {
    const body = (await request.json()) as ResumeProfileInput;
    const updated = await updateResumeProfile(
      session.token,
      session.workspace.id,
      profileId,
      body,
    );
    return NextResponse.json(updated);
  } catch (error) {
    return handleBffError(error, "Unable to update resume profile.");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  const { profileId } = await params;

  try {
    const result = await deleteResumeProfile(
      session.token,
      session.workspace.id,
      profileId,
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleBffError(error, "Unable to delete resume profile.");
  }
}
