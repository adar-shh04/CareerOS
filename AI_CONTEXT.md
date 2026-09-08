# CareerOS AI Agent Context Protocol

This repository is designed for human and agent collaboration. Treat the following documents as durable project context, not optional background reading:

1. `README.md` — Product overview, current feature status, local setup, environment variables.
2. `PROJECT_MANIFEST.md` — Product principles, module scope, technology stack, and workflow.
3. `AGENTS.md` — Engineering workflow rules (read this before every change).
4. `docs/decisions/Product_Memory.md` — Confirmed product and architecture decisions.
5. `docs/architecture/System_Architecture.md` — System architecture, data flow, and module boundaries.
6. `docs/architecture/API_Reference.md` — API endpoint reference (all implemented endpoints).
7. `docs/roadmap/Feature_Delivery_Status.md` — Live feature inventory with accurate implementation status.
8. `apps/api/prisma/schema.prisma` — Authoritative database schema.
9. Existing source code, tests, and migrations.

## Decision protocol

- Do not contradict an accepted decision in `Product_Memory.md`. Update Product Memory when a product decision changes.
- Treat source code and the Prisma schema as the source of truth — documentation may lag behind code.
- Separate facts, assumptions, proposals, and accepted decisions in every design discussion.
- Do not turn founder context into product-specific code. Adarsh is the first power user; CareerOS serves many users.
- Preserve user agency: prepare, recommend, draft, and remind, but do not auto-apply or send bulk outreach.
- Use the minimum personal data necessary and retain clear provenance and consent for imported data.

## Architecture rules

- **Multi-tenancy:** Every piece of data is scoped to an `organizationId`. Never query without workspace isolation.
- **Authentication:** Use Better Auth. Never assume session = active organization. Verify `activeOrganizationId` and membership.
- **AI:** All AI requests route through `AiCapabilityService`. Never fabricate output. Never block core functionality on AI availability.
- **Master Career Profile:** The source of verified career truth. AI Coach reads it; never modifies it.
- **Resume Profiles:** AI Coach may write to Resume Profiles. Master Career Profile is never touched.
- **BYOK:** Optional. Platform AI config supported. Core functionality (matching, CRM, Handbook) must work without any AI.
- **Client IDs:** Frontend temporary IDs (e.g. `exp-1`) are normalized to `randomUUID()` by the service layer — do not throw on them.

## Implementation protocol

- Read `AGENTS.md` before making any change.
- Inspect existing code, schema, and tests before modifying.
- Trace actual request/data flow before assuming architecture.
- Reproduce the problem before fixing it.
- Make the smallest correct change.
- Run `pnpm lint`, `pnpm check-types`, `pnpm build` before declaring complete.
- Run `git diff --check` before finishing.
- Do not commit changes unless explicitly asked.
- Do not perform destructive database operations without explicit approval.

## Documentation protocol

- Update `Product_Memory.md` for confirmed product decisions.
- Update `Feature_Delivery_Status.md` when features are completed or deferred.
- Update `Implementation_Checklist.md` in the same change that completes or defers a task.
- Update `System_Architecture.md` when architecture changes materially.
- Update `API_Reference.md` when endpoints are added or changed.
