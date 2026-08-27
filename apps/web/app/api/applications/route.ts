import { NextResponse } from "next/server";

import {
  ApiError,
  fetchApplications,
  trackApplication,
} from "@/lib/api";
import { getServerSession } from "@/lib/server-session";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const apps = await fetchApplications(session.token, session.workspace.id);
    return NextResponse.json(apps);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Failed to load applications.";
    return NextResponse.json({ message }, { status });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      jobId?: string;
      status?: string;
    };

    if (!body.jobId) {
      return NextResponse.json(
        { message: "jobId is required" },
        { status: 400 },
      );
    }

    const app = await trackApplication(
      session.token,
      session.workspace.id,
      body.jobId,
      body.status ?? "saved",
    );
    return NextResponse.json(app);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Failed to create application.";
    return NextResponse.json({ message }, { status });
  }
}
