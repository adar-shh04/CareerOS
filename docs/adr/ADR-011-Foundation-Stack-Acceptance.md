# ADR-011: Accept the TypeScript-first foundation stack

- **Status:** Accepted
- **Date:** 2026-07-21
- **Supersedes:** ADR-010 Foundation Stack

## Context

CareerOS is ready to begin Phase 1 implementation and deployment. The architecture needs a stable starting point for a modern web product, secure multi-tenant domain services, background workers, AI-provider adapters, self-hosting, and CI.

## Decision

CareerOS will use a TypeScript-first Turborepo monorepo:

- Next.js for the web application.
- NestJS for the API and background worker processes.
- PostgreSQL with pgvector for persistent data and vector search when justified.
- Redis for queues and caching.
- OpenAPI for API contracts.
- Docker Compose for local orchestration.
- GitHub Actions for continuous integration.

## Alternatives considered

- **Next.js plus FastAPI:** A valid data/AI-oriented alternative, but it introduces a second primary application language before the product needs it.
- **One full-stack Next.js application:** Simpler at first, but risks coupling UI, domain services, workers, and integration logic as modules grow.
- **Separate repositories:** Rejected because the web client, API contracts, and shared domain types will evolve together during the foundation phase.

## Consequences

Implementation can now create the runnable monorepo baseline. Python can still be introduced later for a focused capability when its value outweighs the additional operational complexity; that change requires an ADR. ADR-010 is retained as the original proposal and is superseded by this accepted decision.
