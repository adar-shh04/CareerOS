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
