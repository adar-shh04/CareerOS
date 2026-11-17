import * as fs from 'node:fs';
import * as path from 'node:path';

import dotenv from 'dotenv';

process.env.NODE_ENV = 'test';

const rootEnv = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
}
const localEnv = path.resolve(__dirname, '../.env');
if (fs.existsSync(localEnv)) {
  dotenv.config({ path: localEnv, override: true });
}

// apps/api/.env is loaded with override, so DATABASE_URL always points at the
// developer database. To run the DB-backed suites (including the concurrency
// tests) against a disposable, fully migrated database instead, set
// TEST_DATABASE_URL; it takes precedence over everything above. Unset, nothing
// changes.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

process.env.BETTER_AUTH_SECRET ??=
  'test-better-auth-secret-minimum-32-characters-long';
process.env.BYOK_ENCRYPTION_KEY ??=
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

// Integration tests must never contact live external APIs unless explicitly configured
delete process.env.APIFY_API_TOKEN;
delete process.env.OPENROUTER_API_KEY;
delete process.env.OPENAI_API_KEY;
delete process.env.ANTHROPIC_API_KEY;
delete process.env.GEMINI_API_KEY;
delete process.env.MISTRAL_API_KEY;
delete process.env.GROQ_API_KEY;
