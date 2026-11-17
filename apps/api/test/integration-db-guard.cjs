'use strict';

/**
 * Safety guard for the authenticated integration test (`test:integration`).
 *
 * The runner used to fall back to a built-in connection URL with default
 * credentials, and a helper script created and removed databases (ending other
 * sessions first) over a built-in administrative connection. This module
 * replaces all of that with one rule: the operator must name a disposable
 * database explicitly, and it is validated here, with NO network access,
 * before anything connects or starts.
 *
 * Contract of resolveIntegrationDatabaseUrl():
 *  - INTEGRATION_DATABASE_URL must be set (no default, no fallback to
 *    DATABASE_URL).
 *  - It must be a postgresql:// / postgres:// URL with a host and a database.
 *  - The database name must contain a disposable marker as a whole word
 *    (test, tmp, temp, disposable, integration, e2e, scratch, ephemeral,
 *    throwaway, ci). There is no override: if the name is not obviously
 *    disposable, rename the database.
 *  - It must not be the same host:port/database as any DATABASE_URL or
 *    DIRECT_URL the developer configured (shell environment, apps/api/.env,
 *    repository-root .env). Loopback spellings are treated as one host.
 *  - Credentials never appear in any error message.
 *
 * The test never creates, drops or resets a database and never terminates
 * sessions. The operator owns the database lifecycle (see
 * test/INTEGRATION_TESTS.md).
 *
 * This is plain CommonJS so the .mjs scripts and the jest tests can both load
 * it without a build step. src/testing/test-database-guard.ts (the jest
 * guard) applies the same target rules; src/integration-database-guard.spec.ts
 * checks the two stay in agreement.
 */

const fs = require('node:fs');
const path = require('node:path');

const INTEGRATION_DATABASE_ENV = 'INTEGRATION_DATABASE_URL';

/** Exit code the scripts use when the guard refuses (distinct from test failure). */
const GUARD_EXIT_CODE = 2;

class IntegrationDatabaseGuardError extends Error {
  constructor(message) {
    super(`[integration database guard] ${message}`);
    this.name = 'IntegrationDatabaseGuardError';
  }
}

const LOOPBACK_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '[::1]',
  '0.0.0.0',
]);

/** Whole-word disposable markers: careeros_integration yes, careeros / latest no. */
const DISPOSABLE_NAME_MARKER =
  /(^|[^a-z])(test|tests|tmp|temp|disposable|integration|e2e|scratch|ephemeral|throwaway|ci)([^a-z]|$)/i;

/**
 * @param {string} url
 * @returns {{host: string, port: string, database: string} | null}
 *   Never returns or logs credentials.
 */
function parseDatabaseTarget(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    return null;
  }
  const rawHost = parsed.hostname.toLowerCase();
  let database;
  try {
    database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  } catch {
    return null;
  }
  if (!rawHost || !database) return null;
  return {
    host: LOOPBACK_HOSTS.has(rawHost) ? 'localhost' : rawHost,
    port: parsed.port || '5432',
    database,
  };
}

function describeTarget(target) {
  return `${target.host}:${target.port}/${target.database}`;
}

function looksDisposable(database) {
  return DISPOSABLE_NAME_MARKER.test(database);
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {readonly (string | undefined)[]} developerUrls every DATABASE_URL /
 *   DIRECT_URL the developer configured
 * @returns {string} the validated integration database URL
 * @throws {IntegrationDatabaseGuardError}
 */
function resolveIntegrationDatabaseUrl(env, developerUrls) {
  const requested = (env[INTEGRATION_DATABASE_ENV] || '').trim();
  if (!requested) {
    throw new IntegrationDatabaseGuardError(
      `${INTEGRATION_DATABASE_ENV} is not set. Create a disposable PostgreSQL database, ` +
        `migrate it, and set ${INTEGRATION_DATABASE_ENV} to its URL. ` +
        `There is deliberately no default. See apps/api/test/INTEGRATION_TESTS.md.`,
    );
  }

  const target = parseDatabaseTarget(requested);
  if (!target) {
    throw new IntegrationDatabaseGuardError(
      `${INTEGRATION_DATABASE_ENV} is not a valid postgresql:// URL with a host and a database name.`,
    );
  }

  const collides = developerUrls.some((candidate) => {
    const dev = candidate ? parseDatabaseTarget(candidate) : null;
    return (
      dev !== null &&
      dev.host === target.host &&
      dev.port === target.port &&
      dev.database === target.database
    );
  });
  if (collides) {
    throw new IntegrationDatabaseGuardError(
      `${INTEGRATION_DATABASE_ENV} points at the developer database (${describeTarget(target)}). ` +
        `Use a separate disposable database.`,
    );
  }

  if (!looksDisposable(target.database)) {
    throw new IntegrationDatabaseGuardError(
      `Refusing database "${target.database}": its name does not look disposable ` +
        `(expected a word such as test, tmp, temp, disposable, integration, e2e, scratch or ci, ` +
        `e.g. careeros_integration). Rename it; there is no override.`,
    );
  }

  return requested;
}

/**
 * DATABASE_URL / DIRECT_URL values from an .env file, WITHOUT touching
 * process.env and without any network access. Unreadable files yield [].
 * @param {string} file
 * @returns {(string | undefined)[]}
 */
function readDeveloperUrlsFromEnvFile(file) {
  try {
    if (!fs.existsSync(file)) return [];
    const { parse } = require('dotenv');
    const values = parse(fs.readFileSync(file, 'utf8'));
    return [values.DATABASE_URL, values.DIRECT_URL];
  } catch {
    return [];
  }
}

/** The developer's configured database URLs: shell environment + .env files. */
function collectDeveloperUrls(
  env = process.env,
  envFiles = [
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../../.env'),
  ],
) {
  return [
    env.DATABASE_URL,
    env.DIRECT_URL,
    ...envFiles.flatMap(readDeveloperUrlsFromEnvFile),
  ];
}

/** Validate against the real process environment and the developer's .env files. */
function resolveForProcess(env = process.env, envFiles) {
  return resolveIntegrationDatabaseUrl(env, collectDeveloperUrls(env, envFiles));
}

/**
 * Environment for the API process the integration test launches: the validated
 * URL is the ONLY database the process can see. Both DATABASE_URL and
 * DIRECT_URL are set to it, so neither an inherited developer value nor one
 * loaded from .env can win (main.ts re-applies explicit values after loading
 * .env files).
 */
function buildApiEnv(baseEnv, databaseUrl) {
  return {
    ...baseEnv,
    DATABASE_URL: databaseUrl,
    DIRECT_URL: databaseUrl,
  };
}

module.exports = {
  GUARD_EXIT_CODE,
  INTEGRATION_DATABASE_ENV,
  IntegrationDatabaseGuardError,
  buildApiEnv,
  collectDeveloperUrls,
  describeTarget,
  looksDisposable,
  parseDatabaseTarget,
  resolveForProcess,
  resolveIntegrationDatabaseUrl,
};
