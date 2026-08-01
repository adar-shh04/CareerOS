import { NextResponse } from "next/server";

import { fetchByokStatus } from "@/lib/api";
import { getServerSession } from "@/lib/server-session";

export async function GET() {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const credentials = await fetchByokStatus(
      session.token,
      session.workspace.id,
    );

    return NextResponse.json({
      configured: credentials.length > 0,
      providers: credentials.map((c) => c.provider),
    });
  } catch {
    return NextResponse.json(
      { configured: false, providers: [] },
      { status: 200 },
    );
  }
}
