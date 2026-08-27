import { NextResponse } from "next/server";

import { parseResume } from "@/lib/api";
import { getServerSession } from "@/lib/server-session";

export async function POST(request: Request) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { resumeText: string };
    if (!body.resumeText) {
      return NextResponse.json({ message: "resumeText is required." }, { status: 400 });
    }

    const parsedData = await parseResume(
      session.token,
      session.workspace.id,
      body,
    );

    return NextResponse.json(parsedData);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to parse resume.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
