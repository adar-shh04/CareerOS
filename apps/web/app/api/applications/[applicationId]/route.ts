import { NextResponse } from "next/server";

import {
  ApiError,
  deleteApplication,
  updateApplicationState,
} from "@/lib/api";
import { getServerSession } from "@/lib/server-session";

interface RouteParams {
  params: Promise<{ applicationId: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { applicationId } = await params;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      status?: string;
      notes?: string;
      appliedAt?: string;
    };

    const app = await updateApplicationState(
      session.token,
      session.workspace.id,
      applicationId,
      body,
    );
    return NextResponse.json(app);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Failed to update application.";
    return NextResponse.json({ message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { applicationId } = await params;

  try {
    await deleteApplication(session.token, session.workspace.id, applicationId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Failed to delete application.";
    return NextResponse.json({ message }, { status });
  }
}
