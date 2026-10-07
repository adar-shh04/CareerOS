import { NextResponse } from "next/server";

import { fetchByokStatus } from "@/lib/api";
import { getBffSession, handleBffError } from "@/lib/bff";

export async function GET() {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const credentials = await fetchByokStatus(
      session.token,
      session.workspace.id,
    );

    return NextResponse.json({
      configured: credentials.length > 0,
      providers: credentials.map((c) => c.provider),
      credentials,
    });
  } catch (error) {
    return handleBffError(error, "Failed to load BYOK status.");
  }
}
