import { NextResponse } from "next/server";

import { fetchMarketIntelligence } from "@/lib/api";
import { getBffSession, handleBffError } from "@/lib/bff";

export async function GET() {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const market = await fetchMarketIntelligence(
      session.token,
      session.workspace.id,
    );
    return NextResponse.json(market);
  } catch (error) {
    return handleBffError(error, "Failed to fetch market intelligence.");
  }
}
