import { NextResponse } from "next/server";

import { ApiError, importLatexResume } from "@/lib/api";
import { getServerSession } from "@/lib/server-session";

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      latexCode?: string;
    };

    if (!body.latexCode?.trim()) {
      return NextResponse.json(
        { message: "latexCode is required" },
        { status: 400 },
      );
    }

    const result = await importLatexResume(
      session.token,
      session.workspace.id,
      {
        name: body.name,
        latexCode: body.latexCode,
      },
    );

    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Failed to import LaTeX resume.";
    return NextResponse.json({ message }, { status });
  }
}
