# ADR-003: Bring Your Own Keys and Credentials

- **Status:** Accepted
- **Date:** 2026-07-21

## Context

AI usage and external integrations can create variable cost, privacy, and provider-choice constraints.

## Decision

CareerOS uses an opt-in BYOK/BYOC model. Users connect their own AI-provider and third-party credentials. Credentials must be encrypted at rest, never rendered after saving, and used only for approved capabilities.

## Alternatives considered

- **Platform-funded shared API keys:** Rejected because it makes costs unpredictable and reduces user choice.
- **One required provider:** Rejected because it creates lock-in and excludes self-hosted/local models.

## Consequences

The system requires a credential vault abstraction, provider capability metadata, consent-aware plugin connections, and safe observability that never logs secrets.
