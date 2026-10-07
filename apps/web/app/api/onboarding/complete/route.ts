import type { OnboardingProfileInput } from "@repo/types";
import { NextResponse } from "next/server";

import { completeOnboarding } from "@/lib/api";
import { getBffSession, handleBffError } from "@/lib/bff";

export async function POST(request: Request) {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const body = (await request.json()) as OnboardingProfileInput;

    if (!body.name || !body.workspaceName) {
      return NextResponse.json(
        {
          message: "Name and workspace name are required.",
          statusCode: 400,
        },
        { status: 400 },
      );
    }

    const updatedSession = await completeOnboarding(session.token, body);
    return NextResponse.json(updatedSession);
  } catch (error) {
    return handleBffError(error, "Unable to complete onboarding.");
  }
}
