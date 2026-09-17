# CareerOS Core API

The backend API service for CareerOS, built with NestJS, Prisma v7, and PostgreSQL. It enforces multi-tenant workspace isolation, deterministic job matching, LaTeX resume profile generation, and capability-aware AI coaching.

---

## Architecture & Modules

```text
apps/api/src/
├── auth/                 # Better Auth v1.4 instance, session resolution, BetterAuthGuard
├── career-profile/       # Master Career Profile service & transactional Prisma repository
├── resume-profile/       # Resume Profiles, LaTeX generator, versions, parser heuristics
├── jobs/                 # Ingestion (Apify adapter), SHA-256 deduplication, normalization, matching
├── applications/         # Applications CRM service & lifecycle transitions
├── ai/                   # AI Capability Service, BYOK AES-256-GCM encryption, provider routing
├── workspace/            # Multi-tenant workspace management & onboarding
├── database/             # Prisma client service & connection lifecycle
└── config/               # NestJS environment configuration validation
```

### Key Architectural Principles

- **Multi-Tenant Isolation**: Every database record is strictly scoped to an `organizationId`. Requests are authenticated via `BetterAuthGuard` and resolve the tenant context from `activeOrganizationId`.
- **Deterministic Job Matching**: Multi-dimensional scoring (skill, role, experience, location, seniority) computed deterministically without relying on unpredictable LLM calls.
- **LaTeX-First Resumes**: Resume profiles maintain canonical LaTeX templates updated via AST-like section transformations, ensuring clean, ATS-compliant output.
- **Zero Fabricated Intelligence**: When AI providers (BYOK or platform-level) are unavailable, AI features return honest capability-unavailable responses rather than synthetic or hallucinated results.

---

## Database & Migrations

PostgreSQL is managed through Prisma v7 with `@prisma/adapter-pg`.

```bash
# Generate Prisma client
pnpm --filter careeros-api db:generate

# Run migrations in development
pnpm --filter careeros-api db:migrate:dev

# Seed development database (requires SEED_USER_PASSWORD)
SEED_USER_PASSWORD="YourLocalDevPassword" pnpm --filter careeros-api db:seed
```

---

## Development

```bash
# Start API in watch mode
pnpm --filter careeros-api start:dev

# Run unit and service test suites
pnpm --filter careeros-api test

# Run tests in band (matches CI)
pnpm --filter careeros-api exec jest --runInBand

# Compile without emitting files (typecheck)
pnpm --filter careeros-api exec tsc --noEmit

# Lint code
pnpm --filter careeros-api lint
```
