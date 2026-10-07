import { NextResponse } from "next/server";

import { ApiError } from "./api";
import { getServerSession, type ServerSession } from "./server-session";

export interface BffErrorPayload {
  message: string;
  statusCode: number;
  error?: string;
  details?: unknown;
}

/**
 * Standardized BFF error handler.
 * Preserves upstream HTTP status codes (400, 401, 403, 404, 409, 422, 429, 5xx)
 * and structured error fields while preventing internal stack leakages.
 */
export function handleBffError(
  error: unknown,
  defaultMessage = "An unexpected error occurred.",
): NextResponse<BffErrorPayload> {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        message: error.message,
        statusCode: error.status,
        error: error.error,
        details: error.details,
      },
      { status: error.status },
    );
  }

  // Client sent invalid/unparseable JSON in request body
  if (error instanceof SyntaxError) {
    return NextResponse.json(
      {
        message: "Malformed request payload.",
        statusCode: 400,
        error: "Bad Request",
      },
      { status: 400 },
    );
  }

  // Upstream NestJS API or backend connection failure
  if (
    error instanceof TypeError &&
    (error.message.includes("fetch failed") ||
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("ENOTFOUND"))
  ) {
    return NextResponse.json(
      {
        message: "Upstream API service is currently unreachable.",
        statusCode: 502,
        error: "Bad Gateway",
      },
      { status: 502 },
    );
  }

  const message = error instanceof Error ? error.message : defaultMessage;
  return NextResponse.json(
    {
      message,
      statusCode: 500,
      error: "Internal Server Error",
    },
    { status: 500 },
  );
}

/**
 * Fast session resolution for BFF route handlers.
 * Avoids redundant organization metadata lookups since route handlers
 * only need the authenticated token and workspaceId.
 */
export async function getBffSession(): Promise<
  | { session: ServerSession; unauthorizedResponse: null }
  | { session: null; unauthorizedResponse: NextResponse<BffErrorPayload> }
> {
  const session = await getServerSession({ fetchMetadata: false });

  if (!session) {
    return {
      session: null,
      unauthorizedResponse: NextResponse.json(
        { message: "Unauthorized", statusCode: 401, error: "Unauthorized" },
        { status: 401 },
      ),
    };
  }

  return { session, unauthorizedResponse: null };
}
