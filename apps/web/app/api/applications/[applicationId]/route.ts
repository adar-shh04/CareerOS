import { NextResponse } from "next/server";

import {
  deleteApplication,
  fetchApplication,
  updateApplicationState,
} from "@/lib/api";
import { getBffSession, handleBffError } from "@/lib/bff";

interface RouteParams {
  params: Promise<{ applicationId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  const { applicationId } = await params;

  try {
    const app = await fetchApplication(
      session.token,
      session.workspace.id,
      applicationId,
    );
    return NextResponse.json(app);
  } catch (error) {
    return handleBffError(error, "Failed to load application.");
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

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
    return handleBffError(error, "Failed to update application.");
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  const { applicationId } = await params;

  try {
    await deleteApplication(session.token, session.workspace.id, applicationId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleBffError(error, "Failed to delete application.");
  }
}
