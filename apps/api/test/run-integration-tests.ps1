$ErrorActionPreference = "Stop"

$env:DATABASE_URL = "postgresql://careeros:careeros@localhost:5432/careeros_integration?schema=public"

# Temporarily delete APIFY_API_TOKEN from process so test can use mocked ingestion
if (Test-Path Env:APIFY_API_TOKEN) {
    Remove-Item Env:APIFY_API_TOKEN
}

Write-Host "Setting up integration database..." -ForegroundColor Cyan
node .\apps\api\test\setup-integration-db.mjs

try {
  Write-Host "Applying migrations..." -ForegroundColor Cyan
  pnpm --filter careeros-api exec prisma migrate deploy

  Write-Host "Building API..." -ForegroundColor Cyan
  pnpm --filter careeros-api run build

  Write-Host "Running integration tests..." -ForegroundColor Cyan
  pnpm --filter careeros-api test:integration
} finally {
  Write-Host "Cleaning up integration database..." -ForegroundColor Cyan
  node .\apps\api\test\setup-integration-db.mjs --cleanup
}
