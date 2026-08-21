# CareerOS — Agent Instructions

## Project
CareerOS is an open-source, self-hostable, multi-tenant Career Operating System.

Goal:
Reduce repetitive job-search work and increase interview probability.

## Repository
Monorepo:
- Turborepo
- pnpm
- apps/web — Next.js frontend
- apps/api — NestJS backend
- Prisma + PostgreSQL
- packages/* — shared packages

## Authentication
Better Auth is used for authentication.

Organizations/workspaces use:
- Organization
- Member
- Invitation
- session.activeOrganizationId

Users may have an initial personal workspace.

Do not replace Better Auth with custom authentication.

## Current architecture
Frontend:
- Next.js
- React
- TypeScript
- Tailwind CSS v4

Backend:
- NestJS
- Prisma
- PostgreSQL
- Better Auth

## Current product areas
- Authentication
- Workspace / organization onboarding
- Career Profile
- Job Radar
- Job ingestion
- Job normalization
- Job deduplication
- Deterministic job matching
- Resume Intelligence

## Job Radar
Job Radar currently supports:
- seeded jobs
- search
- filtering
- saved jobs
- remote filtering
- dismissed jobs
- job details drawer
- match information
- skills breakdown
- action buttons

## Database
PostgreSQL runs through Docker.

Prisma schema:
apps/api/prisma/schema.prisma

Migrations:
apps/api/prisma/migrations/

## Important engineering rule
Before changing architecture:
1. Inspect the existing implementation.
2. Trace the actual request/data flow.
3. Check Prisma schema and migrations.
4. Check Better Auth session behavior.
5. Reproduce the problem.
6. Make the smallest correct change.
7. Run relevant tests/type checks/lint/build.
8. Inspect git diff before finishing.

Do not rewrite working architecture unnecessarily.

## Authentication rule
Never assume that having a Better Auth session automatically means the user has an active organization.

Verify:
- authenticated user
- session
- activeOrganizationId
- organization membership
- workspace access

when the route requires workspace context.

## Database rule
Never perform destructive database operations without explicit approval.

Before migrations:
- inspect current schema
- inspect migration history
- determine whether existing data is affected
- explain destructive/irreversible operations

## Quality gates

Before declaring work complete, run as appropriate:

pnpm run lint
pnpm run check-types
pnpm run build

For API changes also inspect relevant tests.

## Git
Do not reset, revert, delete, or overwrite user changes unless explicitly instructed.

Do not commit changes unless explicitly asked.

Always inspect:
git status
git diff
git diff --check

before finishing.

## Current working state
The repository is actively under development.

Do not assume the repository matches documentation from previous conversations.

Treat the actual source code, schema, migrations, tests, and command output as authoritative.