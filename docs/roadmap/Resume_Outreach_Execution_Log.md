# Resume and Outreach Execution Log

**Priority source:** `work instructions.md` provided on 2026-07-21  
**Status:** Active implementation track

## Implemented: Canonical Master Career Profile Contract

The API domain layer now defines a tenant-scoped `MasterCareerProfile` contract at `apps/api/src/career-profile/career-profile.types.ts`.

It keeps one structured source of truth for:

- Identity and links.
- Education and experience.
- Projects and achievements.
- Skills and technologies.
- Publications, hackathons, and certifications.
- Record provenance metadata for user-entered and reviewed import sources.

The profile service at `apps/api/src/career-profile/career-profile.service.ts`:

- Prevents empty workspace IDs and names.
- Normalizes a profile into complete empty collections.
- Isolates records by workspace ID.
- Versions profile updates without mutating the caller's input.
- Returns defensive copies so downstream modules cannot silently alter canonical data.

Focused service tests exist at `apps/api/src/career-profile/career-profile.service.spec.ts`.

## Validated Locally

- `pnpm install --frozen-lockfile --ignore-scripts`
- `pnpm --filter careeros-api exec jest src/career-profile/career-profile.service.spec.ts --runInBand`
- `pnpm run lint`
- `pnpm run check-types`
- `pnpm run build`

All commands passed. The existing generated NestJS startup warning about an unawaited `bootstrap()` promise remains non-failing and unrelated to this work.

## Completed: Career Profile Module Registration

`CareerProfileModule` is registered in `apps/api/src/app.module.ts` as of commit `e0e2f9f`. Its earlier in-memory contract endpoints were reachable for local contract development:

- `GET /workspaces/:workspaceId/career-profile`
- `PUT /workspaces/:workspaceId/career-profile`

Focused profile tests, API e2e tests, lint, type checks, and production builds passed locally on 2026-07-22. The controller is no longer registered: client-supplied workspace path parameters are not an authorization boundary, so routes stay unavailable until authentication supplies a trusted workspace context.

## Completed: Durable Master Career Profile Persistence

The in-memory store has been replaced by a Prisma-backed PostgreSQL repository. `apps/api/prisma/schema.prisma` defines UUID-keyed workspace and Master Career Profile records plus normalized collection tables. The initial Prisma Migrate migration uses workspace foreign keys and indexes; repository writes use a transaction and optimistic profile versioning. The module intentionally does not register the profile controller until authentication derives workspace access from the authenticated principal.

The initial migration was applied and verified against an isolated local PostgreSQL container on port `5433`. Repository, service, API e2e, workspace lint, type-check, and production-build validation passed on 2026-07-22. The repository test emitted a non-failing upstream `pg` deprecation warning during Prisma adapter cleanup; track it when upgrading Prisma/pg.

## Next Feature Slice

Build resume-profile and resume-version contracts on top of `MasterCareerProfile`; do not duplicate career facts. Resume profiles must only contain targeting, visibility, ordering, highlighting, and wording rules. Generated resume versions must retain immutable snapshots and output metadata for HTML, LaTeX, and PDF artifacts.

## Outreach Constraint

Cold-email and networking intelligence may read the selected job, resume version, contact provenance, and approved company context. It must create reviewable drafts only; it must never send automatically or generate bulk outreach.
