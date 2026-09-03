import type { ResumeProfileInput } from "@repo/types";
import { NextResponse } from "next/server";

import {
  ApiError,
  deleteResumeProfile,
  fetchResumeProfile,
  updateResumeProfile,
} from "@/lib/api";
import { getServerSession } from "@/lib/server-session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const session = await getServerSession();
  const { profileId } = await params;

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const profile = await fetchResumeProfile(
      session.token,
      session.workspace.id,
      profileId,
    );
    return NextResponse.json(profile);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Unable to fetch resume profile.";
    return NextResponse.json({ message }, { status });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const session = await getServerSession();
  const { profileId } = await params;

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

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
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Unable to update resume profile.";
    return NextResponse.json({ message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const session = await getServerSession();
  const { profileId } = await params;

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await deleteResumeProfile(
      session.token,
      session.workspace.id,
      profileId,
    );
    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Unable to delete resume profile.";
    return NextResponse.json({ message }, { status });
  }
}
