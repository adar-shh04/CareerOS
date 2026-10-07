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
