import { NextResponse } from "next/server";

import { storeByokCredential } from "@/lib/api";
import { getBffSession, handleBffError } from "@/lib/bff";

export async function POST(request: Request) {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const body = (await request.json()) as {
      provider?: string;
      apiKey?: string;
    };

    if (!body.provider || !body.apiKey) {
      return NextResponse.json(
        { message: "Provider and API key are required.", statusCode: 400 },
        { status: 400 },
      );
    }

    const result = await storeByokCredential(
      session.token,
      session.workspace.id,
      {
        provider: body.provider,
        apiKey: body.apiKey,
      },
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleBffError(error, "Unable to store credential.");
  }
}
