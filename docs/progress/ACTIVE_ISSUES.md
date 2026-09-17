# CareerOS Current Issues Handoff

Date: 2026-07-23

## Resolved in authorization and lint stabilization pass

- Authenticated workspace boundary is in place: global `JwtAuthGuard`, `WorkspaceMemberGuard` on workspace-scoped routes, and `@CurrentUser` for the authenticated principal.
- Durable career-profile APIs are registered and protected at `GET/PUT /workspaces/:workspaceId/career-profile`; membership is verified before handler execution.
- Workspace and BYOK controllers use the same JWT and membership guards.
- Web auth lint violations are cleared: synchronous logout route handler and `void`-wrapped async form submit handlers on login, register, and onboarding.
- API lint is clean after Nest module rule alignment, bootstrap `void` handling, test-env `??=` defaults, and targeted service conditional fixes.
- Shared ESLint configs and package-level lint entrypoints cover `packages/types`, `packages/ui`, and `packages/utils`.
- Local validation passed on 2026-07-23: `turbo run lint` (6/6), `pnpm run check-types` (7/7), `pnpm run build` (3/3), and `git diff --check`.

## Remaining issues and risks

### 1. Known warnings

The web build reports the existing Next.js middleware-to-proxy deprecation warning. Track it when upgrading Next.js routing conventions.

### 2. Database-dependent test availability

One API integration suite is skipped when its database environment is unavailable. The API e2e suite passes against the configured test environment. Keep the isolated PostgreSQL migration container (`careeros-migration-db` on host port `5433`) documented in the handoff before changing local database infrastructure.

### 3. CI verification still pending

The GitHub Actions workflow is updated, but a green run on `main` has not been confirmed in this pass. Verify pnpm setup, frozen lockfile install, lint, type-check, API unit tests, and build in CI after commit.

### 4. Next product boundary

Resume Profiles and immutable Resume Versions are the next product slice. Build them over the canonical Master Career Profile without duplicating career facts.

## Notes

The merge, API stabilization, authenticated profile boundary, and lint blockers are resolved locally. The repository is commit-ready for this checkpoint; confirm CI independently after push.
