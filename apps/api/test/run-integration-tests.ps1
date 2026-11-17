# Runs the authenticated multi-tenant integration test.
#
# You must name a DISPOSABLE, already created and already migrated PostgreSQL
# database yourself:
#
#   $env:INTEGRATION_DATABASE_URL = "postgresql://<user>:<password>@<host>:<port>/careeros_integration"
#
# This script never creates, migrates, drops or resets a database and never
# terminates sessions: the database lifecycle belongs to you. It reads no
# default URL and does not use DATABASE_URL. See test\INTEGRATION_TESTS.md.
$ErrorActionPreference = "Stop"

$apiDir = Split-Path -Parent $PSScriptRoot

# 1. Validate the target BEFORE building, connecting or starting anything. The
#    check only parses the URL and reads .env files: it performs no network
#    access, and it never prints credentials.
Write-Host "Validating INTEGRATION_DATABASE_URL..." -ForegroundColor Cyan
node (Join-Path $PSScriptRoot "check-integration-env.mjs")
if ($LASTEXITCODE -ne 0) {
  Write-Host "Refusing to run the integration test." -ForegroundColor Red
  exit $LASTEXITCODE
}

# Let the test use its own mocked ingestion rather than a live provider.
if (Test-Path Env:APIFY_API_TOKEN) {
  Remove-Item Env:APIFY_API_TOKEN
}

# 2. Build and run. `test:integration` validates again before it builds.
Write-Host "Running integration tests..." -ForegroundColor Cyan
Push-Location $apiDir
try {
  pnpm run test:integration
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
