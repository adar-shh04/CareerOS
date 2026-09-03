import { NextResponse } from "next/server";

import { ApiError, parseResume } from "@/lib/api";
import { getServerSession } from "@/lib/server-session";

export async function POST(request: Request) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";

    let parsedData;
    if (contentType.includes("multipart/form-data")) {
      const incomingFormData = await request.formData();
      const file = incomingFormData.get("file");
      const resumeText = incomingFormData.get("resumeText");

      const outgoingFormData = new FormData();
      if (file instanceof Blob) {
        outgoingFormData.append(
          "file",
          file,
          file instanceof File ? file.name : "resume.pdf",
        );
      }
      if (typeof resumeText === "string" && resumeText.trim()) {
        outgoingFormData.append("resumeText", resumeText);
      }

      parsedData = await parseResume(
        session.token,
        session.workspace.id,
        outgoingFormData,
      );
    } else {
      const body = (await request.json().catch(() => ({}))) as {
        resumeText?: string;
        fileBase64?: string;
        fileName?: string;
        mimeType?: string;
      };

      if (!body.resumeText && !body.fileBase64) {
        return NextResponse.json(
          { message: "Either resume file or resumeText must be provided." },
          { status: 400 },
        );
      }

      parsedData = await parseResume(
        session.token,
        session.workspace.id,
        body,
      );
    }

    return NextResponse.json(parsedData);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Unable to parse resume.";
    return NextResponse.json({ message }, { status });
  }
}
