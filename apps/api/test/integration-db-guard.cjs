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

// ── Host normalisation ────────────────────────────────────────────────────
// Two URLs can name the same PostgreSQL instance with different spellings. The
// collision check compares NORMALISED hosts, so every way of writing "this
// machine" collapses to `localhost`, and numeric spellings of any other IPv4
// address collapse to dotted-quad. No DNS is used (the guard performs no
// network access), so two different HOSTNAMES that merely resolve to the same
// machine cannot be recognised; that limit is documented in
// test/INTEGRATION_TESTS.md.

/**
 * inet_aton-style IPv4 parsing: 1-4 parts, each decimal, 0x-hex or 0-octal; the
 * last part fills the remaining bytes (so 2130706433, 0x7f000001, 0177.0.0.1
 * and 127.1 all mean 127.0.0.1). WHATWG URL does NOT normalise these for the
 * postgresql: scheme, but the OS resolver does when the client connects.
 * @returns {number[] | null} four octets, or null if this is not a numeric IPv4
 */
function parseLegacyIPv4(host) {
  const parts = host.split('.');
  if (parts.length < 1 || parts.length > 4) return null;
  const numbers = [];
  for (const part of parts) {
    let value;
    if (/^0x[0-9a-f]+$/i.test(part)) value = parseInt(part, 16);
    else if (/^0[0-7]*$/.test(part)) value = parseInt(part, 8);
    else if (/^[1-9][0-9]*$/.test(part)) value = parseInt(part, 10);
    else return null;
    numbers.push(value);
  }
  const last = numbers[numbers.length - 1];
  if (last >= 256 ** (5 - numbers.length)) return null;
  for (let i = 0; i < numbers.length - 1; i++) {
    if (numbers[i] > 255) return null;
  }
  let total = last;
  for (let i = 0; i < numbers.length - 1; i++) {
    total += numbers[i] * 256 ** (3 - i);
  }
  return [
    Math.floor(total / 256 ** 3) % 256,
    Math.floor(total / 256 ** 2) % 256,
    Math.floor(total / 256) % 256,
    total % 256,
  ];
}

/** Expand an IPv6 text form (optionally with an embedded dotted IPv4) to 8 groups. */
function expandIPv6(text) {
  let value = text.toLowerCase();
  const lastColon = value.lastIndexOf(':');
  const tail = value.slice(lastColon + 1);
  if (tail.includes('.')) {
    const v4 = parseLegacyIPv4(tail);
    if (!v4 || tail.split('.').length !== 4) return null;
    const hi = ((v4[0] << 8) | v4[1]).toString(16);
    const lo = ((v4[2] << 8) | v4[3]).toString(16);
    value = `${value.slice(0, lastColon + 1)}${hi}:${lo}`;
  }
  const halves = value.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] === '' ? [] : halves[0].split(':');
  const rest = halves.length === 2 && halves[1] !== '' ? halves[1].split(':') : [];
  let groups;
  if (halves.length === 1) {
    groups = head;
  } else {
    const missing = 8 - head.length - rest.length;
    if (missing < 1) return null;
    groups = [...head, ...Array(missing).fill('0'), ...rest];
  }
  if (groups.length !== 8) return null;
  const numbers = groups.map((group) =>
    /^[0-9a-f]{1,4}$/.test(group) ? parseInt(group, 16) : NaN,
  );
  return numbers.some(Number.isNaN) ? null : numbers;
}

function isLoopbackIPv4(octets) {
  // 127.0.0.0/8 is loopback; 0.0.0.0 connects to this machine as well.
  return octets[0] === 127 || octets.every((octet) => octet === 0);
}

/**
 * @returns {string} 'localhost' for every spelling of this machine, a canonical
 *   dotted-quad for other IPv4 addresses (including IPv4-mapped IPv6), the
 *   lower-cased bracketed address for other IPv6, otherwise the lower-cased
 *   hostname without a trailing dot.
 */
function normalizeHost(rawHost) {
  const host = rawHost.toLowerCase().replace(/\.$/, '');
  if (host === 'localhost' || host.endsWith('.localhost')) return 'localhost';

  if (host.startsWith('[') && host.endsWith(']')) {
    const groups = expandIPv6(host.slice(1, -1));
    if (!groups) return host;
    const high = groups.slice(0, 5).every((group) => group === 0);
    const embedded = [
      groups[6] >> 8,
      groups[6] & 0xff,
      groups[7] >> 8,
      groups[7] & 0xff,
    ];
    if (groups.slice(0, 7).every((group) => group === 0) && groups[7] <= 1) {
      return 'localhost'; // :: and ::1
    }
    // ::ffff:a.b.c.d (IPv4-mapped) and ::a.b.c.d (IPv4-compatible)
    if (high && (groups[5] === 0xffff || groups[5] === 0)) {
      return isLoopbackIPv4(embedded) ? 'localhost' : embedded.join('.');
    }
    return host;
  }

  const octets = parseLegacyIPv4(host);
  if (octets) return isLoopbackIPv4(octets) ? 'localhost' : octets.join('.');
  return host;
}

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
    host: normalizeHost(rawHost),
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
    if (!candidate) return false;
    const dev = parseDatabaseTarget(candidate);
    if (dev === null) {
      // A value that is meant to be a PostgreSQL URL but cannot be understood
      // means the collision check cannot be completed: fail closed. Values with
      // other schemes are not PostgreSQL endpoints and cannot collide.
      if (/^\s*postgres(ql)?:/i.test(candidate)) {
        throw new IntegrationDatabaseGuardError(
          'A developer DATABASE_URL / DIRECT_URL looks like a PostgreSQL URL but ' +
            'cannot be understood (it needs a host and a database name), so the ' +
            'developer-database collision check cannot be completed. Fix or unset it.',
        );
      }
      return false;
    }
    return (
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
 * process.env and without any network access.
 *
 * FAILS CLOSED: a file that does not exist contributes nothing, but a file that
 * exists and cannot be read or parsed throws, because the developer-database
 * collision check cannot be completed without it. Silently skipping an
 * unreadable configuration file would let a collision through.
 * @param {string} file
 * @returns {(string | undefined)[]}
 * @throws {IntegrationDatabaseGuardError}
 */
function readDeveloperUrlsFromEnvFile(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') return [];
    throw new IntegrationDatabaseGuardError(
      `Cannot read ${file} (${(error && error.code) || 'unknown error'}), so the ` +
        `developer-database collision check cannot be completed. ` +
        `Fix the file or its permissions, or remove it.`,
    );
  }
  try {
    const values = require('dotenv').parse(text);
    return [values.DATABASE_URL, values.DIRECT_URL];
  } catch {
    throw new IntegrationDatabaseGuardError(
      `Cannot parse ${file}, so the developer-database collision check cannot be completed. ` +
        `Fix the file or remove it.`,
    );
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
