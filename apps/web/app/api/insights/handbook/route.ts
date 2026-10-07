import { NextResponse } from "next/server";

import { fetchCareerHandbook } from "@/lib/api";
import { getBffSession, handleBffError } from "@/lib/bff";

export async function GET() {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const handbook = await fetchCareerHandbook(
      session.token,
      session.workspace.id,
    );
    return NextResponse.json(handbook);
  } catch (error) {
    return handleBffError(error, "Failed to fetch career handbook.");
  }
}
