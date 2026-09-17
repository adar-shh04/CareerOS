# ADR-005: External services use a plugin and adapter model

- **Status:** Accepted
- **Date:** 2026-07-21

## Context

Job boards, applicant-tracking systems, AI providers, mail services, and calendars change frequently and have distinct permissions and terms.

## Decision

All third-party connections are optional plugins or adapters with explicit capabilities, credentials, permissions, rate limits, provenance, and normalized outputs.

## Alternatives considered

- **Direct source-specific logic in core modules:** Rejected because it tightly couples product behavior to volatile external systems.
- **One universal scraper:** Rejected because it cannot reliably respect permissions, policies, and source-specific semantics.

## Consequences

Core modules depend on canonical contracts. A plugin registry and permission model are foundational architecture rather than a later polish feature.
