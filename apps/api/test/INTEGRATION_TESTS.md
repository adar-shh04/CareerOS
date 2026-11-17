# Authenticated integration tests

`test:integration` uses the real Better Auth HTTP handler, Nest application,
Prisma client, and PostgreSQL database.

**You own the database lifecycle.** The test and its runner never create,
migrate, drop or reset a database, and never terminate sessions. You supply a
disposable, already created and already migrated PostgreSQL database through
`INTEGRATION_DATABASE_URL`. There is no default URL and no fallback to
`DATABASE_URL`: if the variable is missing, nothing runs.

## Safe setup and execution

1. **Create an empty disposable database** on an endpoint that is not your
   development database. For example a throwaway container on an unused port
   (adjust the port if it is taken):

   ```powershell
   docker run -d --name careeros-integration-pg -p 127.0.0.1:55432:5432 `
     -e POSTGRES_USER=careeros -e POSTGRES_PASSWORD=<choose-a-password> `
     -e POSTGRES_DB=careeros_integration postgres:17-alpine
   ```

2. **Migrate it.** The prisma CLI reads `DIRECT_URL` / `DATABASE_URL`, so scope
   them to this one command. Existing migrations contain legacy destructive
   operations and are safe only on a newly created, disposable database:

   ```powershell
   $url = "postgresql://careeros:<password>@127.0.0.1:55432/careeros_integration?schema=public"
   $env:DATABASE_URL = $url; $env:DIRECT_URL = $url
   pnpm --filter careeros-api exec prisma migrate deploy
   Remove-Item Env:DATABASE_URL, Env:DIRECT_URL
   ```

3. **Name it for the test and run:**

   ```powershell
   $env:INTEGRATION_DATABASE_URL = $url
   .\apps\api\test\run-integration-tests.ps1     # or: pnpm --filter careeros-api test:integration
   ```

4. **Clean up yourself** when finished, e.g.
   `docker rm -f careeros-integration-pg`. Nothing in the test does this.

The target is validated first, before the build, before any import that can
connect, and before the API process starts. The check performs no network
access and never prints credentials. It refuses:

- a missing or blank `INTEGRATION_DATABASE_URL` (`DATABASE_URL` and
  `TEST_DATABASE_URL` are never substituted);
- anything that is not a `postgresql://` / `postgres://` URL with a host and a
  database name;
- the developer database: the same host, port and database name as any
  `DATABASE_URL` / `DIRECT_URL` in your shell, `apps/api/.env` or the repository
  root `.env` (`localhost`, `127.0.0.1` and `::1` count as one host);
- a database whose name does not contain a disposable marker as a whole word
  (`test`, `tmp`, `temp`, `disposable`, `integration`, `e2e`, `scratch`,
  `ephemeral`, `throwaway`, `ci`; for example `careeros_integration`, not
  `careeros`, `postgres` or `careeros_latest`). There is no override: rename the
  database.

A refusal exits with code 2 and an explanatory message. The API process the test
launches receives the validated URL as both `DATABASE_URL` and `DIRECT_URL`, so
neither an inherited nor an `.env` developer value can be used.

The rules live in `test/integration-db-guard.cjs`; they are unit-tested in
`src/integration-database-guard.spec.ts`, which also runs the scripts under a
preload that fails the process on any socket, DNS or process-spawn attempt, to
prove a refused configuration never connects or starts a server.

## Jest suites that need a database (opt-in)

`pnpm test` and `pnpm test:e2e` never use the development database, even though
`apps/api/.env` points at it. Database-backed suites (`*.db.spec.ts`, the
repository integrity specs and the e2e app spec) **skip themselves** unless you
opt in with `TEST_DATABASE_URL`; every other unit test runs with no database at
all. The rules live in `src/testing/test-database-guard.ts` (unit-tested in
`src/test-database-guard.spec.ts`) and are applied by `test/setup-env.ts`.

To run them, create a disposable database, migrate it (as in step 2 above), and
point `TEST_DATABASE_URL` at it:

```powershell
$env:TEST_DATABASE_URL = "postgresql://careeros:<password>@127.0.0.1:55432/careeros_test?schema=public"
pnpm --filter careeros-api test          # includes the database-backed suites
pnpm --filter careeros-api test:e2e
```

The Jest guard refuses, with an explanatory error and without connecting:

- a `TEST_DATABASE_URL` that is not a `postgresql://` URL with a database name;
- the developer database, i.e. the same host, port and database name as any
  `DATABASE_URL` / `DIRECT_URL` from your shell or `.env` files;
- a database whose name does not contain a test marker as a whole word (the same
  list as above).

Only `CAREEROS_ALLOW_UNSAFE_TEST_DATABASE=1` bypasses the last two checks for
the Jest suites, with a warning on every run. Do not set it in shared scripts or
CI. It has no effect on `test:integration`.
