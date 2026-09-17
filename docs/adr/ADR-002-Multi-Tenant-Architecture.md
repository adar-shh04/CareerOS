# ADR-002: Multi-tenant architecture with user-owned data

- **Status:** Accepted
- **Date:** 2026-07-21

## Context

Adarsh is the first user, but the product is intended for many individuals and organizations. Career data, contacts, and credentials are sensitive.

## Decision

All domain records are tenant-scoped. Authentication, authorization, storage, background work, and analytics must enforce tenant boundaries. Users retain control over their imported data and connected credentials.

## Alternatives considered

- **Single-user personal tool:** Rejected because it hardcodes the first user’s workflows and prevents a credible self-hosted SaaS path.
- **Shared global user data by default:** Rejected because it introduces unacceptable privacy and consent risks.

## Consequences

Every schema, API, event, and query needs a clear ownership model. Tenant isolation must be tested from the first implementation slice.
