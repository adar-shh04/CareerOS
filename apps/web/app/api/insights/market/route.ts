import { NextResponse } from "next/server";

import { ApiError, fetchMarketIntelligence } from "@/lib/api";
import { getServerSession } from "@/lib/server-session";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const market = await fetchMarketIntelligence(
      session.token,
      session.workspace.id,
    );
    return NextResponse.json(market);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch market intelligence.";
    return NextResponse.json({ message }, { status });
  }
}
