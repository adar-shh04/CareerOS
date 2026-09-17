# ADR-006: Master Career Profile drives versioned resume profiles

- **Status:** Accepted
- **Date:** 2026-07-21

## Context

Users target multiple career paths and otherwise maintain duplicate, drifting resume files.

## Decision

CareerOS stores a structured Master Career Profile. Named resume profiles select and tailor that data for specific roles. Every generated artifact is immutable and versioned. The system recommends a profile per job, with user override.

## Alternatives considered

- **Independent uploaded PDFs only:** Rejected because they cannot support consistent automation, structured comparison, or reliable versioning.
- **One universal resume:** Rejected because targeted resumes improve relevance for distinct roles.

## Consequences

Schema design must preserve source data, selected content, template version, generation inputs, artifact metadata, and performance links without overwriting prior versions.
