import { NextResponse } from "next/server";

import { completeOnboarding } from "@/lib/api";
import { getServerSession } from "@/lib/server-session";

export async function POST(request: Request) {
  const serverSession = await getServerSession();

  if (!serverSession) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      workspaceName?: string;
      targetRole?: string;
    };

    if (!body.name || !body.workspaceName) {
      return NextResponse.json(
        { message: "Name and workspace name are required." },
        { status: 400 },
      );
    }

    const updatedSession = await completeOnboarding(serverSession.token, {
      name: body.name,
      workspaceName: body.workspaceName,
      targetRole: body.targetRole,
    });

    return NextResponse.json(updatedSession);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to complete onboarding.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
