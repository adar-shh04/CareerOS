/**
 * Decides which database (if any) the jest suites may use.
 *
 * Why this exists: `apps/api/.env` is loaded with override, so jest used to
 * inherit the DEVELOPER database from it. Database-backed suites therefore ran
 * against developer data without anyone choosing that, and a killed run left
 * test rows behind in it.
 *
 * Contract:
 *  - DB-backed suites run ONLY when TEST_DATABASE_URL is set (explicit opt-in).
 *    Without it, DATABASE_URL is blanked, so those suites skip themselves
 *    (`describe.skip`) and ordinary unit tests run with no database at all.
 *  - The opted-in database must not be a developer database (the same
 *    host:port/database as any DATABASE_URL / DIRECT_URL the developer
 *    configured) and its name must look like a throwaway test database.
 *  - Both checks can be bypassed only deliberately, with
 *    CAREEROS_ALLOW_UNSAFE_TEST_DATABASE=1.
 *
 * This file is pure (no I/O, no jest) so it can be unit-tested without a
 * database; see src/test-database-guard.spec.ts.
 * Lives under src/testing (excluded from the production build, see
 * tsconfig.build.json) so tsc and the unit tests can reach it; it is loaded by
 * test/setup-env.ts.
 */

export const TEST_DATABASE_ENV = 'TEST_DATABASE_URL';
export const UNSAFE_OVERRIDE_ENV = 'CAREEROS_ALLOW_UNSAFE_TEST_DATABASE';

export class TestDatabaseGuardError extends Error {
  constructor(message: string) {
    super(`[test database guard] ${message}`);
    this.name = 'TestDatabaseGuardError';
  }
}

export interface DatabaseTarget {
  host: string;
  port: string;
  database: string;
}

const LOOPBACK_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '[::1]',
  '0.0.0.0',
]);

/**
 * A database name counts as a test database when it contains one of these as
 * a whole word (separated by `_`, `-`, `.`, digits or the string ends):
 * careeros_test, careeros_test_2, careeros-ci, careeros_integration, tmp_db...
 * "latest" and "contest" deliberately do not match.
 */
const TEST_NAME_MARKER =
  /(^|[^a-z])(test|tests|tmp|temp|disposable|integration|e2e|scratch|ephemeral|throwaway|ci)([^a-z]|$)/i;

/** Parses a PostgreSQL URL; never returns or logs credentials. */
export function parseDatabaseTarget(url: string): DatabaseTarget | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    return null;
  }
  const rawHost = parsed.hostname.toLowerCase();
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!rawHost || !database) return null;
  return {
    host: LOOPBACK_HOSTS.has(rawHost) ? 'localhost' : rawHost,
    port: parsed.port || '5432',
    database,
  };
}

export function describeTarget(target: DatabaseTarget): string {
  return `${target.host}:${target.port}/${target.database}`;
}

export function looksLikeTestDatabase(database: string): boolean {
  return TEST_NAME_MARKER.test(database);
}

/**
 * @param env process.env (read for TEST_DATABASE_URL and the override flag)
 * @param developerUrls every DATABASE_URL / DIRECT_URL the developer has
 *   configured (ambient environment and `.env` files), used to refuse a
 *   TEST_DATABASE_URL that points at the developer database
 * @returns the URL the suites may use, or `undefined` when no database was
 *   requested (DB-backed suites must skip)
 */
export function resolveTestDatabaseUrl(
  env: Record<string, string | undefined>,
  developerUrls: readonly (string | undefined)[],
): string | undefined {
  const requested = env[TEST_DATABASE_ENV]?.trim();
  if (!requested) return undefined;

  const target = parseDatabaseTarget(requested);
  if (!target) {
    throw new TestDatabaseGuardError(
      `${TEST_DATABASE_ENV} is not a valid postgresql:// URL with a host and a database name.`,
    );
  }

  if (env[UNSAFE_OVERRIDE_ENV] === '1') {
    console.warn(
      `[test database guard] ${UNSAFE_OVERRIDE_ENV}=1: using ${describeTarget(target)} without safety checks.`,
    );
    return requested;
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
    throw new TestDatabaseGuardError(
      `${TEST_DATABASE_ENV} points at the developer database (${describeTarget(target)}). ` +
        `Create a disposable database, apply the migrations to it and use that instead. ` +
        `Set ${UNSAFE_OVERRIDE_ENV}=1 only if you really mean to run the suites against it.`,
    );
  }

  if (!looksLikeTestDatabase(target.database)) {
    throw new TestDatabaseGuardError(
      `Refusing database "${target.database}": its name does not look like a test database ` +
        `(expected a word such as test, tmp, temp, disposable, integration, e2e, scratch or ci, ` +
        `e.g. careeros_test). Rename it, or set ${UNSAFE_OVERRIDE_ENV}=1 to override deliberately.`,
    );
  }

  return requested;
}
