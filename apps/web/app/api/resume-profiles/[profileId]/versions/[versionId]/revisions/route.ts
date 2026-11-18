import type { CreateResumeVersionRevisionInput } from "@repo/types";
import { NextResponse } from "next/server";

import { createResumeVersionRevision } from "@/lib/api";
import { getBffSession, handleBffError } from "@/lib/bff";

interface RouteParams {
  params: Promise<{ profileId: string; versionId: string }>;
}

const ID_LIST_KEYS = [
  "experienceIds",
  "projectIds",
  "skillIds",
  "certificationIds",
  "achievementIds",
] as const;

function badRequest(message: string) {
  return NextResponse.json(
    { statusCode: 400, error: "Bad Request", message },
    { status: 400 },
  );
}

function parseBody(raw: unknown): CreateResumeVersionRevisionInput | null {
  if (typeof raw !== "object" || raw === null) return null;
  const body = raw as Record<string, unknown>;
  const ids = body.selectedRecordIds;
  if (typeof ids !== "object" || ids === null) return null;
  const idRecord = ids as Record<string, unknown>;

  const selectedRecordIds = {} as Record<(typeof ID_LIST_KEYS)[number], string[]>;
  for (const key of ID_LIST_KEYS) {
    const list = idRecord[key];
    if (!Array.isArray(list) || !list.every((id) => typeof id === "string")) {
      return null;
    }
    selectedRecordIds[key] = list;
  }

  const documentMode = body.documentMode;
  if (
    documentMode !== undefined &&
    documentMode !== "auto" &&
    documentMode !== "generate"
  ) {
    return null;
  }

  return { selectedRecordIds, documentMode };
}

export async function POST(request: Request, { params }: RouteParams) {
  const { session, unauthorizedResponse } = await getBffSession();
  if (unauthorizedResponse) return unauthorizedResponse;

  const { profileId, versionId } = await params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }
  const input = parseBody(raw);
  if (!input) {
    return badRequest(
      "Provide selectedRecordIds (lists of record ids) and an optional documentMode of auto or generate.",
    );
  }

  try {
    const created = await createResumeVersionRevision(
      session.token,
      session.workspace.id,
      profileId,
      versionId,
      input,
    );
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleBffError(error, "Unable to create the revised version.");
  }
}
