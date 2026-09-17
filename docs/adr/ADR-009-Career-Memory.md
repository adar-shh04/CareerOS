# ADR-009: Career Memory is explicit, auditable, and user-controlled

- **Status:** Accepted
- **Date:** 2026-07-21

## Context

Personalization improves when the system understands goals, preferences, history, and outcomes over time. Inferred memories can also surprise users or encode stale information.

## Decision

Career Memory stores explicit preferences and carefully labeled, reviewable observations derived from user activity. Every memory has source, confidence, timestamp, tenant scope, and edit/delete controls. Memory informs recommendations but never silently overrides user choices.

## Alternatives considered

- **No persistent memory:** Rejected because users would repeatedly configure the same context.
- **Unbounded hidden profiling:** Rejected due to transparency, privacy, and trust risks.

## Consequences

The data model needs provenance and retention controls. UI must distinguish user-entered preferences from system observations and explain how either affected a result.
