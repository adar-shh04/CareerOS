import { NextResponse } from "next/server";

import { storeByokCredential } from "@/lib/api";
import { getServerSession } from "@/lib/server-session";

export async function POST(request: Request) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      provider?: string;
      apiKey?: string;
    };

    if (!body.provider || !body.apiKey) {
      return NextResponse.json(
        { message: "Provider and API key are required." },
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
    const message =
      error instanceof Error ? error.message : "Unable to store credential.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
