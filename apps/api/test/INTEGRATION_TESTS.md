# Authenticated integration tests

`test:integration` uses the real Better Auth HTTP handler, Nest application,
Prisma client, and PostgreSQL database. It never creates or resets a database.

Run it only with a fresh, disposable database URL. For example, start a
temporary PostgreSQL container on an unused port, apply migrations to that URL,
then run:

```powershell
.\apps\api\test\run-integration-tests.ps1
```

Do not point `DATABASE_URL` at the normal development database. Existing
migrations contain legacy destructive operations and are safe here only because
the database is newly created and disposable.

## Jest suites that need a database (opt-in)

`pnpm test` and `pnpm test:e2e` never use the development database, even though
`apps/api/.env` points at it. Database-backed suites (`*.db.spec.ts`, the
repository integrity specs and the e2e app spec) **skip themselves** unless you
opt in with `TEST_DATABASE_URL`; every other unit test runs with no database at
all. The rules live in `src/testing/test-database-guard.ts` (unit-tested in
`src/test-database-guard.spec.ts`) and are applied by `test/setup-env.ts`.

To run them, create a disposable database, migrate it, and point
`TEST_DATABASE_URL` at it:

```powershell
# any empty PostgreSQL works; this starts a throwaway one on port 55432
docker run -d --name careeros-test-pg -p 127.0.0.1:55432:5432 `
  -e POSTGRES_USER=careeros -e POSTGRES_PASSWORD=disposable-pw `
  -e POSTGRES_DB=careeros_test postgres:17-alpine

$url = "postgresql://careeros:disposable-pw@127.0.0.1:55432/careeros_test?schema=public"
$env:DATABASE_URL = $url; $env:DIRECT_URL = $url      # for prisma only
pnpm --filter careeros-api exec prisma migrate deploy
Remove-Item Env:DATABASE_URL, Env:DIRECT_URL

$env:TEST_DATABASE_URL = $url
pnpm --filter careeros-api test          # includes the database-backed suites
pnpm --filter careeros-api test:e2e
docker rm -f careeros-test-pg            # when finished
```

The guard refuses, with an explanatory error and without connecting:

- a `TEST_DATABASE_URL` that is not a `postgresql://` URL with a database name;
- the developer database, i.e. the same host, port and database name as any
  `DATABASE_URL` / `DIRECT_URL` from your shell or `.env` files;
- a database whose name does not contain a test marker as a whole word
  (`test`, `tmp`, `temp`, `disposable`, `integration`, `e2e`, `scratch`,
  `ephemeral`, `throwaway`, `ci`; for example `careeros_test`, not
  `careeros` or `careeros_latest`).

Only `CAREEROS_ALLOW_UNSAFE_TEST_DATABASE=1` bypasses the last two checks, with
a warning on every run. Do not set it in shared scripts or CI.

`test:integration` (the authenticated tenancy script above) is separate: it uses
`INTEGRATION_DATABASE_URL` and its own setup.
