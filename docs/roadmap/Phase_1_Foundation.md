# Phase 1: Foundation

## Goal

Deliver the minimum secure, multi-tenant foundation required for a user to create a CareerOS account, build a structured career profile, manage targeted resume profiles, configure preferences and BYOK connections, and navigate a cohesive dashboard.

## Delivery slices

1. **Repository and deployment baseline:** Accept ADR-010, create the monorepo, local environment, CI, containers, linting, and test foundation.
2. **Identity and tenancy:** Authentication, tenant-aware authorization, user/workspace schema, onboarding, and tenant-bound audit events.
3. **Career profile:** Master Career Profile CRUD with validation and import-ready data model.
4. **Resume profiles:** Named profile CRUD, content selection, profile comparison foundation, and immutable version model.
5. **Settings and BYOK:** Preferences, encrypted credential storage, provider capability checks, and safe connection lifecycle.
6. **Dashboard shell:** Accessible navigation, empty states, privacy cues, and module entry points.

## Explicitly deferred

- Live job-source integrations and full Opportunity Scoring.
- Resume parsing/generation and LaTeX compilation.
- Company intelligence and relationship graph UI.
- External email/calendar actions.
- Interview and learning modules.

## Exit criteria

- A newly registered user can complete onboarding without seeing or affecting another tenant’s data.
- They can create and edit a Master Career Profile plus multiple named resume profiles.
- They can safely add, test, revoke, and delete an integration credential without secret exposure.
- The dashboard provides clear next steps and empty states for the upcoming Job Intelligence module.
- CI runs formatting, type checking, tests, and a production build for the selected stack.
