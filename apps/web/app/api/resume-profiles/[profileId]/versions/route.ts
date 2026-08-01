import type { CreateResumeVersionInput } from "@repo/types";
import { NextResponse } from "next/server";

import { createResumeVersion, listResumeVersions } from "@/lib/api";
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
    const versions = await listResumeVersions(
      session.token,
      session.workspace.id,
      profileId,
    );
    return NextResponse.json(versions);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to list resume versions.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const session = await getServerSession();
  const { profileId } = await params;

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

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
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create resume version.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
