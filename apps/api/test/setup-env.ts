import * as fs from 'node:fs';
import * as path from 'node:path';

import dotenv from 'dotenv';

import { resolveTestDatabaseUrl } from '../src/testing/test-database-guard';

process.env.NODE_ENV = 'test';

// Database URLs the developer has configured, from the shell and from the
// .env files below. They identify the DEVELOPER database: the guard refuses to
// run the suites against it.
const developerUrls: (string | undefined)[] = [
  process.env.DATABASE_URL,
  process.env.DIRECT_URL,
];

const rootEnv = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
}
const localEnv = path.resolve(__dirname, '../.env');
if (fs.existsSync(localEnv)) {
  dotenv.config({ path: localEnv, override: true });
}

developerUrls.push(process.env.DATABASE_URL, process.env.DIRECT_URL);

// Database-backed suites are opt-in. They run only against TEST_DATABASE_URL,
// a disposable, fully migrated database whose name looks like a test database
// and which is not the developer database (see test-database-guard.ts for the
// rules and the deliberate override). Without it, DATABASE_URL is blanked so
// those suites skip themselves and no test can reach the developer database:
// an empty string (not "unset") also stops better-auth.instance.ts from
// falling back to its built-in localhost URL.
const testDatabaseUrl = resolveTestDatabaseUrl(process.env, developerUrls);
process.env.DATABASE_URL = testDatabaseUrl ?? '';
process.env.DIRECT_URL = testDatabaseUrl ?? '';

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
