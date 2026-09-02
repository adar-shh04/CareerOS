import { NextResponse } from "next/server";

import { parseResume } from "@/lib/api";
import { getServerSession } from "@/lib/server-session";

export async function POST(request: Request) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      resumeText?: string;
      fileBase64?: string;
      fileName?: string;
      mimeType?: string;
    };

    if (!body.resumeText && !body.fileBase64) {
      return NextResponse.json(
        { message: "Either resumeText or fileBase64 must be provided." },
        { status: 400 },
      );
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
