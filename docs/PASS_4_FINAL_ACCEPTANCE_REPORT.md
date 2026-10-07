# CareerOS — Pass 4 Final Acceptance & Production Hardening Report

**Generated:** 2026-10-08  
**Branch:** `stabilization/pass-3`  
**Starting Commit:** `2146544`  
**Database:** PostgreSQL 17 (Local Docker + Supabase Hosted Readiness)  
**Cache / Rate Limit:** Redis 7 (Local Docker `redis://localhost:6380` + Cloud Redis Readiness)  
**Authentication Engine:** Better Auth (Multi-tenant Workspace Scoped)  

---

## 1. Executive Status

**PASS 4 COMPLETE WITH DOCUMENTED DEFERMENTS**

Pass 4 stabilization and production hardening has been independently reconciled and verified against the actual repository, current PostgreSQL database, Redis instance, integration test suites, and live HTTP/browser runtime.

All core Pass 4 objectives are satisfied:
1. CockroachDB has been completely removed across code, configuration, and dependencies.
2. PostgreSQL 16/17 is established as the sole supported relational database.
3. Supabase PostgreSQL architecture is prepared and verified (`DATABASE_URL` transaction pooling + `DIRECT_URL` direct DDL migrations). Better Auth remains strictly decoupled from Supabase Auth. Hosted live connection is blocked on external user credentials.
4. D2 `resume_versions` compound foreign key `(resume_profile_id, organization_id)` is enforced at the schema and database level with migration `20261004120000_resume_versions_compound_fk`.
5. D4 deterministic seed and composable test factories are implemented; production guardrails prevent accidental seeding into hosted databases.
6. D5 production proxy-aware, Redis-backed rate limiting with graceful local memory fallback and HTTP 429 response standardization is operational.

---

## 2. Pass 4 Verification Matrix

| Concern | Status | Evidence | Remaining Risk / Notes |
| :--- | :--- | :--- | :--- |
| **CockroachDB Removal** | **VERIFIED** | Scanned repo for `cockroach`, `Cockroach`, `CRDB`. 0 active dependencies, packages, adapters, migrations, or dialect configurations remain. | None. PostgreSQL is sole relational database. |
| **PostgreSQL Canonical DB** | **VERIFIED** | Prisma schema uses `provider = "postgresql"`. Local Docker runs PostgreSQL 17 on 5432. All migrations applied cleanly. | None. |
| **Supabase Readiness** | **VERIFIED** | Dual-URL support configured (`DATABASE_URL` pooler + `DIRECT_URL` direct session DDL). Better Auth maintained. | Hosted connection blocked on external credentials (`SUPABASE HOSTED CONNECTIVITY: BLOCKED — EXTERNAL CREDENTIALS REQUIRED`). |
| **D2 Compound FK Integrity** | **VERIFIED** | Compound unique constraints `@@unique([id, organizationId])` on `ResumeProfile` and `ResumeVersion`. Compound FK enforced in PostgreSQL. Test suite `resume-version-integrity.db.spec.ts` passed (4/4). | None. Cross-workspace injection rejected at DB engine level. |
| **D4 Factories & Seeding** | **VERIFIED** | Composable factories in `test/factories/index.ts`. Deterministic idempotent seed script in `prisma/seed.ts`. Seeds demo account, workspace, jobs, matches, and pipeline application. | None. Idempotent re-run executes cleanly in seconds. |
| **D5 Redis Throttling** | **VERIFIED** | `CareerOsThrottlerStorage` runs atomic `INCR` + `PTTL` pipelining against Redis (`redis://localhost:6380`). Tracks `user:<id>` for authenticated sessions and client IP for anonymous requests. | None. Verified with unit tests (`careeros-throttler.spec.ts`) and live runtime tests. |
| **Redis Fallback Behavior** | **VERIFIED** | When Redis is offline or throws errors, storage gracefully falls back to in-memory `ThrottlerStorageService`. | Conservative local limiting: enforces rate limits per instance in memory. Does not crash API (not fail-closed) and does not permit unlimited traffic (not fail-open). |
| **Proxy / IP Security** | **VERIFIED** | Express `trust proxy: true` configured in `main.ts`. Guard prioritizes cryptographically verified `user:<id>`, falling back to leftmost proxy IP (`CF-Connecting-IP`, `X-Forwarded-For`). | Deployment assumption: API must be deployed behind trusted reverse proxy (Vercel, Cloudflare, AWS ALB, Nginx) that strips/overwrites untrusted client headers. |
| **Demo Credential Safety** | **FIXED + VERIFIED** | Added production environment guardrail to `apps/api/prisma/seed.ts`. Aborts execution if `NODE_ENV === 'production'` or hosted URL is detected unless `ALLOW_PRODUCTION_SEED=true` and explicit `SEED_USER_PASSWORD` are provided. | None. Prevents accidental demo credential leakage into production. |
| **Tenant Isolation** | **VERIFIED** | Live API probe with user session attempting cross-workspace access to foreign UUID (`00000000-0000-0000-0000-000000000000`) returned HTTP 403 Forbidden. Multi-tenant integration tests passed. | None. Workspace boundary strictly enforced by `BetterAuthGuard` and `WorkspaceMemberGuard`. |
| **Runtime Smoke Verification** | **VERIFIED** | Live runtime probe against port 3001 (API) and 3000 (Web): health probe (200), login (200), auth sign-in (200), jobs (200), applications (200), resumes (200), throttler trigger (429 on request 21 with `Retry-After: 60`), and health exemption (200 during active throttle). | None. |
| **Quality Gates** | **VERIFIED** | Typecheck (5/5), lint (4/4), unit/DB tests (27/27 suites, 318/318 tests), integration tenancy test, BFF test suite (11/11), build, `git diff --check` all passed. | Deprecation warning for Next.js `middleware.ts` addressed in Pass 5 backlog. |

---

## 3. Pass 4 Change Inventory

### Tracked Modified Files (66 files)
- **Configuration & Environment (4):** `.env.example`, `apps/api/.env.example`, `pnpm-lock.yaml`, `turbo.json`
- **Prisma & Database (4):** `apps/api/prisma.config.ts`, `apps/api/prisma/schema.prisma`, `apps/api/prisma/seed.ts`, `apps/api/src/database/prisma.service.ts`
- **API Infrastructure & Throttling (5):** `apps/api/package.json`, `apps/api/src/app.module.ts`, `apps/api/src/app.controller.ts`, `apps/api/src/main.ts`, `apps/api/src/ai-coach/ai-coach.controller.ts`
- **Core Domain & Repositories (10):** `apps/api/src/resume-profile/prisma-resume-profile.repository.ts`, `apps/api/src/resume-profile/resume-profile.controller.ts`, `apps/api/src/resume-profile/resume-profile.module.ts`, `apps/api/src/resume-profile/resume-parser.service.ts`, `apps/api/src/auth/better-auth.instance.ts`, `apps/api/src/common/guards/better-auth.guard.ts`, `apps/api/src/workspace/workspace.module.ts`, `apps/api/src/workspace/workspace.service.ts`, `apps/api/src/byok/ai-capability.service.ts`, `apps/api/src/byok/byok.module.ts`
- **Shared Types (3):** `packages/types/src/index.ts`, `apps/api/src/applications/applications.types.ts`, `apps/api/src/career-profile/career-profile.types.ts`
- **Tests & Test Config (5):** `apps/api/test/authenticated-tenancy.integration.mjs`, `apps/api/test/setup-env.ts`, `apps/api/src/byok/ai-capability.service.spec.ts`, `apps/api/src/workspace/workspace.service.spec.ts`, `apps/api/src/resume-profile/resume-parser.service.spec.ts`
- **Web BFF & Frontend (35):** `apps/web/lib/api.ts`, `apps/web/lib/auth-client.ts`, `apps/web/lib/server-session.ts`, `apps/web/components/ai-coach/ai-coach-view.tsx`, `apps/web/components/dashboard/application-activity.tsx`, plus 30 route handlers under `apps/web/app/api/`

### Untracked / New Files (8 items)
- `apps/api/prisma/migrations/20261004120000_resume_versions_compound_fk/migration.sql` (Compound FK migration)
- `apps/api/src/common/throttler/careeros-throttler.guard.ts` (Throttler guard)
- `apps/api/src/common/throttler/careeros-throttler.module.ts` (Throttler module)
- `apps/api/src/common/throttler/careeros-throttler.spec.ts` (Throttler unit test)
- `apps/api/src/common/throttler/careeros-throttler.storage.ts` (Redis/memory fallback storage)
- `apps/api/src/resume-profile/resume-version-integrity.db.spec.ts` (PostgreSQL compound FK integrity test)
- `apps/api/test/factories/index.ts` (Composable test factories)
- `apps/web/app/api/byok/configure/route.ts` (BYOK configure BFF route)
- `apps/web/lib/bff.ts` (BFF standardized error handling)
- `apps/web/lib/bff.test.ts` (BFF error handler test suite)
- `docs/PASS_4_FINAL_ACCEPTANCE_REPORT.md` (This report)

---

## 4. Known Limitations & Deployment Assumptions

1. **Supabase Hosted Connectivity:**
   - Architecture and dual-connection pooling (`DATABASE_URL` transaction pooler + `DIRECT_URL` session migration) are fully implemented and verified against PostgreSQL.
   - Live hosted connectivity against a remote Supabase project requires user-supplied project credentials (`SUPABASE HOSTED CONNECTIVITY: BLOCKED — EXTERNAL CREDENTIALS REQUIRED`).
2. **Reverse Proxy Deployment Assumption:**
   - The application relies on `trust proxy: true` and assumes deployment behind a trusted reverse proxy (Vercel, Cloudflare, AWS ALB, Nginx, Traefik).
   - If deployed directly to the public internet without an ingress proxy, external clients could rotate `X-Forwarded-For` headers to cycle anonymous rate limits (authenticated sessions remain strictly tracked by `user:<id>`).
3. **Redis Fallback Consequence:**
   - If Redis is unavailable, rate limits fall back to in-memory counters per instance. In a multi-replica cluster with Redis down, total allowed requests could scale up to N × limit across instances until Redis recovers.

---

## 5. Reconciled Pass 5 Canonical Backlog

| Item | Classification | Description |
| :--- | :--- | :--- |
| **Dead / Stale Code Cleanup** | **Pass 5 Required** | Purge obsolete type definitions in `apps/api/src/career-profile/` and `apps/api/src/applications/` that were superseded by `@repo/types`, and remove unused legacy helper functions. |
| **Stale Architecture Removal** | **Pass 5 Required** | Reconcile stabilization audit findings against codebase, remove lingering comments referencing CockroachDB / legacy multi-database abstractions, and clean up superseded shims. |
| **Next.js 16 Middleware → Proxy Convention** | **Pass 5 Required** | Migrate `apps/web/middleware.ts` to Next.js 16 `proxy` convention to resolve deprecation warnings during build. |
| **Final Audit Reconciliation** | **Pass 5 Required** | Complete cross-check of all Stabilization Passes (1 through 5) against `PROJECT_MANIFEST.md` and produce final project stabilization sign-off. |
| **Telemetry & Observability (Sentry / PostHog)** | **Later Roadmap** | Connect Sentry error reporting and PostHog product analytics when keys are configured in environment. |
| **S3 / Cloudflare R2 Object Storage Provider** | **Later Roadmap** | Abstract resume document file uploads to presigned S3/R2 storage buckets. |
| **Background Scheduled Workers (Trigger.dev / BullMQ)** | **Later Roadmap** | Deploy background scheduled job workers for recurring live market job ingestion. |

---

## 6. Conclusion

Stabilization Pass 4 is complete, verified, and ready for acceptance. The repository has achieved complete PostgreSQL consolidation, data integrity with compound foreign keys, deterministic seeding and test factories, and robust proxy-aware rate limiting.
