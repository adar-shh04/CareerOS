# ADR-001: CareerOS is a Career Operating System

- **Status:** Accepted
- **Date:** 2026-07-21

## Context

The product began as a job-discovery idea. A listing-only experience cannot coordinate the resumes, applications, relationships, and learning work that determine job-search outcomes.

## Decision

CareerOS is a multi-module Career Operating System. Job discovery is an entry point, not the full product.

## Alternatives considered

- **Job board only:** Rejected because it emphasizes listing volume and cannot capture the wider job-search workflow.
- **Generic personal CRM:** Rejected because it lacks role, resume, company, and interview context.

## Consequences

The product needs durable cross-module identity and user data, but modules must remain loosely coupled. The roadmap prioritizes a solid foundation before broad integrations.
