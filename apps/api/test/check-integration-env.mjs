// Validates INTEGRATION_DATABASE_URL and exits. It performs NO network access:
// it only parses the URL and reads .env files. `test:integration` and the
// PowerShell runner call it first so misconfiguration fails before a build, a
// database connection or an API process.
import guard from './integration-db-guard.cjs';

try {
  const url = guard.resolveForProcess();
  const target = guard.parseDatabaseTarget(url);
  console.log(
    `Integration database target accepted: ${guard.describeTarget(target)}`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(guard.GUARD_EXIT_CODE);
}
