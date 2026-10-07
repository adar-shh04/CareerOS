import { NextResponse } from "next/server";

import { importLatexResume } from "@/lib/api";
import { getBffSession, handleBffError } from "@/lib/bff";

export async function POST(request: Request) {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      latexCode?: string;
    };

    if (!body.latexCode?.trim()) {
      return NextResponse.json(
        { message: "latexCode is required", statusCode: 400 },
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
    return handleBffError(error, "Failed to import LaTeX resume.");
  }
}
