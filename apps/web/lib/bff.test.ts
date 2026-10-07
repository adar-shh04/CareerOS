import assert from "node:assert/strict";
import test from "node:test";

import { ApiError } from "./api";
import { handleBffError } from "./bff";

interface BffErrorPayload {
  statusCode?: number;
  message?: string;
  error?: string;
  details?: unknown;
}

void test("handleBffError preserves 400 Bad Request from ApiError", async () => {
  const err = new ApiError("Invalid payload fields", 400, "Bad Request", { field: "name" });
  const res = handleBffError(err);
  assert.equal(res.status, 400);
  const data = (await res.json()) as BffErrorPayload;
  assert.equal(data.statusCode, 400);
  assert.equal(data.message, "Invalid payload fields");
  assert.equal(data.error, "Bad Request");
  assert.deepEqual(data.details, { field: "name" });
});

void test("handleBffError preserves 401 Unauthorized from ApiError", async () => {
  const err = new ApiError("Session has expired", 401, "Unauthorized");
  const res = handleBffError(err);
  assert.equal(res.status, 401);
  const data = (await res.json()) as BffErrorPayload;
  assert.equal(data.statusCode, 401);
  assert.equal(data.message, "Session has expired");
});

void test("handleBffError preserves 403 Forbidden from ApiError", async () => {
  const err = new ApiError("User is not a member of this workspace", 403, "Forbidden");
  const res = handleBffError(err);
  assert.equal(res.status, 403);
  const data = (await res.json()) as BffErrorPayload;
  assert.equal(data.statusCode, 403);
  assert.equal(data.message, "User is not a member of this workspace");
});

void test("handleBffError preserves 404 Not Found from ApiError", async () => {
  const err = new ApiError("Job not found", 404, "Not Found");
  const res = handleBffError(err);
  assert.equal(res.status, 404);
  const data = (await res.json()) as BffErrorPayload;
  assert.equal(data.statusCode, 404);
  assert.equal(data.message, "Job not found");
});

void test("handleBffError preserves 409 Conflict from ApiError", async () => {
  const err = new ApiError("Application already exists for this job", 409, "Conflict");
  const res = handleBffError(err);
  assert.equal(res.status, 409);
  const data = (await res.json()) as BffErrorPayload;
  assert.equal(data.statusCode, 409);
  assert.equal(data.message, "Application already exists for this job");
});

void test("handleBffError preserves 422 Unprocessable Entity from ApiError", async () => {
  const err = new ApiError("Skill requirements not satisfied", 422, "Unprocessable Entity");
  const res = handleBffError(err);
  assert.equal(res.status, 422);
  const data = (await res.json()) as BffErrorPayload;
  assert.equal(data.statusCode, 422);
  assert.equal(data.message, "Skill requirements not satisfied");
});

void test("handleBffError preserves 429 Rate Limited from ApiError", async () => {
  const err = new ApiError("Too many requests", 429, "Too Many Requests");
  const res = handleBffError(err);
  assert.equal(res.status, 429);
  const data = (await res.json()) as BffErrorPayload;
  assert.equal(data.statusCode, 429);
  assert.equal(data.message, "Too many requests");
});

void test("handleBffError preserves 500 Internal Server Error from ApiError", async () => {
  const err = new ApiError("Database connection lost", 500, "Internal Server Error");
  const res = handleBffError(err);
  assert.equal(res.status, 500);
  const data = (await res.json()) as BffErrorPayload;
  assert.equal(data.statusCode, 500);
  assert.equal(data.message, "Database connection lost");
});

void test("handleBffError maps SyntaxError to 400 Bad Request", async () => {
  const err = new SyntaxError("Unexpected token in JSON at position 12");
  const res = handleBffError(err);
  assert.equal(res.status, 400);
  const data = (await res.json()) as BffErrorPayload;
  assert.equal(data.statusCode, 400);
  assert.equal(data.message, "Malformed request payload.");
});

void test("handleBffError maps upstream fetch network failures to 502 Bad Gateway", async () => {
  const err = new TypeError("fetch failed: connect ECONNREFUSED 127.0.0.1:4000");
  const res = handleBffError(err);
  assert.equal(res.status, 502);
  const data = (await res.json()) as BffErrorPayload;
  assert.equal(data.statusCode, 502);
  assert.equal(data.message, "Upstream API service is currently unreachable.");
});

void test("handleBffError maps generic unknown errors to 500 Internal Server Error", async () => {
  const err = new Error("Something completely unexpected");
  const res = handleBffError(err);
  assert.equal(res.status, 500);
  const data = (await res.json()) as BffErrorPayload;
  assert.equal(data.statusCode, 500);
  assert.equal(data.message, "Something completely unexpected");
});
