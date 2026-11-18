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
 *  - Host spellings are normalised, so every way of writing "this machine"
 *    (127.0.0.0/8, localhost / *.localhost, 0.0.0.0, ::, ::1, IPv4-mapped and
 *    IPv4-compatible IPv6, decimal / hex / octal / short IPv4) is one host.
 *  - It fails closed: when a database was requested but the developer's
 *    configuration cannot be fully read (an existing .env that is unreadable or
 *    unparseable, or a developer URL that looks like PostgreSQL but cannot be
 *    understood), the run is refused rather than continuing with an incomplete
 *    collision check.
 *
 * ONE implementation of the target rules: URL parsing, host normalisation, the
 * disposable-name marker and the developer .env discovery are the ones in
 * test/integration-db-guard.cjs (the integration-test guard), loaded below and
 * re-exported, so the two guards cannot drift apart. Only the Jest-specific
 * policy (opt-in, deliberate override, messages) lives in this file.
 *
 * Importing it performs no database or network access. Lives under
 * src/testing (excluded from the production build, see tsconfig.build.json) so
 * tsc and the unit tests can reach it; it is loaded by test/setup-env.ts. See
 * src/test-database-guard.spec.ts.
 */

import { createRequire } from 'node:module';
import path from 'node:path';

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

/** The target rules shared with the integration guard (test/integration-db-guard.cjs). */
interface SharedTargetRules {
  parseDatabaseTarget: (url: string) => DatabaseTarget | null;
  describeTarget: (target: DatabaseTarget) => string;
  looksDisposable: (database: string) => boolean;
  collectDeveloperUrls: (
    env: Record<string, string | undefined>,
    envFiles: readonly string[],
  ) => (string | undefined)[];
}

const shared = createRequire(__filename)(
  path.resolve(__dirname, '../../test/integration-db-guard.cjs'),
) as SharedTargetRules;

/**
 * Parses a PostgreSQL URL into a normalised {host, port, database}; never
 * returns or logs credentials. This IS the integration guard's function (same
 * reference), not a copy.
 */
export const parseDatabaseTarget = shared.parseDatabaseTarget;

export const describeTarget = shared.describeTarget;

/**
 * A database name counts as a test database when it contains one of test, tmp,
 * temp, disposable, integration, e2e, scratch, ephemeral, throwaway or ci as a
 * whole word (careeros_test, careeros-ci-2; not "careeros" or "latest").
 */
export const looksLikeTestDatabase = shared.looksDisposable;

const GUARD_PREFIX = /^\[integration database guard\] /;

/**
 * The developer's configured DATABASE_URL / DIRECT_URL values: `env` (the shell
 * environment as it was BEFORE any .env was loaded) plus every `envFiles` entry,
 * read without touching process.env. FAILS CLOSED: a file that exists but
 * cannot be read or parsed throws, because the collision check cannot be
 * completed without it; a file that does not exist contributes nothing.
 */
export function collectDeveloperUrls(
  env: Record<string, string | undefined>,
  envFiles: readonly string[],
): (string | undefined)[] {
  try {
    return shared.collectDeveloperUrls(env, envFiles);
  } catch (error) {
    throw new TestDatabaseGuardError(
      error instanceof Error
        ? error.message.replace(GUARD_PREFIX, '')
        : 'The developer database configuration could not be read.',
    );
  }
}

/**
 * @param env process.env (read for TEST_DATABASE_URL and the override flag)
 * @param developerUrls every DATABASE_URL / DIRECT_URL the developer has
 *   configured (ambient environment and `.env` files), used to refuse a
 *   TEST_DATABASE_URL that points at the developer database. May be a function:
 *   it is then called ONLY when a database was requested and the deliberate
 *   override is not set, so an unreadable .env cannot break a plain run that
 *   uses no database. A function may throw (see collectDeveloperUrls).
 * @returns the URL the suites may use, or `undefined` when no database was
 *   requested (DB-backed suites must skip)
 */
export function resolveTestDatabaseUrl(
  env: Record<string, string | undefined>,
  developerUrls:
    | readonly (string | undefined)[]
    | (() => readonly (string | undefined)[]),
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

  const configured =
    typeof developerUrls === 'function' ? developerUrls() : developerUrls;
  const collides = configured.some((candidate) => {
    if (!candidate) return false;
    const dev = parseDatabaseTarget(candidate);
    if (dev === null) {
      // Meant to be a PostgreSQL URL but cannot be understood: the collision
      // check cannot be completed, so refuse. Other schemes are not PostgreSQL
      // endpoints and cannot collide.
      if (/^\s*postgres(ql)?:/i.test(candidate)) {
        throw new TestDatabaseGuardError(
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
