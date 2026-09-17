# ADR-010: Foundation stack selection

- **Status:** Proposed
- **Date:** 2026-07-21

## Context

Phase 1 needs a stack that supports a polished web product, typed contracts, secure multi-tenant data, background work, AI integrations, and self-hosted deployment. The earlier product discussion suggested a monorepo, Next.js, FastAPI or NestJS, PostgreSQL, Redis, pgvector, Docker Compose, OpenAPI, and CI.

## Proposed decision

Adopt a TypeScript-first monorepo with Next.js for the web application, NestJS for the API and workers, PostgreSQL with pgvector for persistent data, Redis for queues/caching, OpenAPI contracts, Docker Compose for local development, and GitHub Actions for CI.

## Alternatives considered

- **Next.js plus FastAPI:** Strong AI/data ecosystem and a valid alternative, but introduces Python and TypeScript application layers from the outset.
- **Single Next.js full-stack app:** Simpler initially, but risks mixing UI, domain, worker, and integration concerns as modules grow.
- **Separate repositories:** Rejected for the foundation because shared contracts and coordinated changes will be common.

## Consequences

Acceptance authorizes a runnable monorepo scaffold. If rejected, record the replacement before application code is added.
