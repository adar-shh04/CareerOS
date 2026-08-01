# ADR 0001: Replace custom JWT auth with Better Auth

**Status:** Accepted
**Date:** 2026-08-01
**Related:** CareerOS v2 workflow, Phase 2 (Authentication)

## Context

The original auth implementation (`apps/api/src/auth/`) was a hand-rolled
NestJS module: bcrypt password hashing, a custom access/refresh JWT pair
issued via `@nestjs/jwt`, a Passport `JwtStrategy`, and a `JwtAuthGuard`.
Workspace (multi-tenant) membership was fused into the same module —
registration created a `User`, `Workspace`, and `WorkspaceMember` in one
Prisma transaction, and the JWT payload carried `workspaceId`.

This worked, but every future auth feature (password reset, email
verification, OAuth, magic links, session revocation) would have meant
writing and maintaining more of that surface ourselves.

## Decision

Replace the custom implementation with **Better Auth**, using:

- **Prisma adapter** — Better Auth manages its own `User` core fields,
  plus new `Session`, `Account`, and `Verification` tables, via our
  existing Prisma client and Postgres database. No separate auth
  database.
- **Organization plugin, remapped onto existing tables** — rather than
  introducing parallel `Organization`/`Member` tables, Better Auth's
  `organization` and `member` models are configured (via its
  `modelName`/`fields` schema option) to point at our existing
  `Workspace` and `WorkspaceMember` tables. `Workspace` keeps all its
  existing relations (`byokKeys`, `careerProfile`, `resumeProfiles`)
  untouched.
- **Bearer plugin** — the Next.js app is a separate origin from the
  NestJS API. Server-side BFF route handlers in `apps/web/app/api/*`
  forward a session token as `Authorization: Bearer <token>` rather than
  forwarding cookies cross-origin, preserving the existing proxy-route
  pattern with a minimal code change per route.

## Consequences

**What we gained:**
- Deleted ~250 lines of hand-rolled JWT issuance, refresh, and Passport
  strategy code (`auth.service.ts`, `auth.controller.ts`,
  `jwt.strategy.ts`, JWT DTOs, `auth.config.ts`, `jwt-auth.guard.ts`).
- Password reset, email verification, and OAuth providers are now a
  config change, not new endpoints to write and secure.
- Session-based auth (opaque token + server-side session record) instead
  of self-verifying JWTs — sessions can be revoked server-side, which a
  stateless JWT couldn't do without a denylist.

**What this cost us / requires follow-up:**
- **Role type change:** `WorkspaceMember.role` moved from the
  `WorkspaceRole` enum (`OWNER`/`ADMIN`/`MEMBER`) to a plain `String`
  (`"owner"`/`"admin"`/`"member"`, lowercase) — Better Auth's
  organization plugin expects string roles. This was the only forced
  schema change; anywhere reading `WorkspaceRole.OWNER` needed updating.
- **Password migration:** existing `users.password_hash` (bcrypt) values
  are not compatible with Better Auth's credential storage (scrypt, on
  `Account.password`). See `docs/migrations/0001-password-migration.md`
  for options — the practical path is a forced password reset on next
  login for existing accounts, since there is no reversible way to
  convert a bcrypt hash into a scrypt one.
- **`AuthenticatedUser` contract preserved on purpose:** `BetterAuthGuard`
  resolves a Better Auth session and still attaches the same
  `{ id, email, name, workspaceId }` shape to the request that
  `JwtAuthGuard` did. This meant `career-profile`, `resume-profile`,
  `byok`, and `workspace` modules needed zero logic changes — only import
  cleanup.

## Alternatives considered

- **Clerk** — hosted, less code to write, but user/session data would
  live partly outside our Postgres, and mapping Clerk's Organizations
  onto our existing `Workspace` schema would mean either a data migration
  into Clerk or running two sources of truth. NestJS also isn't a
  first-class Clerk target, so we'd still be writing a custom guard to
  verify Clerk's tokens — clawing back much of the "less code" benefit.
- **Supabase Auth** — reasonable if the rest of the stack were on
  Supabase (Postgres + Storage + Auth as one platform). We're on a
  self-hosted Postgres via Prisma with NestJS as the API layer, so
  Better Auth's "bring your own database, we just add the auth tables"
  model fit with less architectural disruption.
