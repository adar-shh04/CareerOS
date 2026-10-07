import { NextResponse } from "next/server";

import {
  fetchApplications,
  trackApplication,
} from "@/lib/api";
import { getBffSession, handleBffError } from "@/lib/bff";

export async function GET() {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const apps = await fetchApplications(session.token, session.workspace.id);
    return NextResponse.json(apps);
  } catch (error) {
    return handleBffError(error, "Failed to load applications.");
  }
}

export async function POST(request: Request) {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      jobId?: string;
      status?: string;
      resumeProfileId?: string;
    };

    if (!body.jobId) {
      return NextResponse.json(
        { message: "jobId is required", statusCode: 400 },
        { status: 400 },
      );
    }

    const app = await trackApplication(
      session.token,
      session.workspace.id,
      body.jobId,
      body.status ?? "saved",
      body.resumeProfileId,
    );
    return NextResponse.json(app);
  } catch (error) {
    return handleBffError(error, "Failed to create application.");
  }
}
