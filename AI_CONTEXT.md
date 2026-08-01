# CareerOS AI Agent Context Protocol

This repository is designed for human and agent collaboration. Treat the following documents as durable project context, not optional background reading:

1. `PROJECT_MANIFEST.md`
2. `docs/decisions/Product_Memory.md`
3. Relevant ADRs in `docs/adr/`
4. Relevant PRDs in `docs/prd/`
5. Relevant architecture and roadmap documents
6. Existing code, schema, tests, and deployment configuration

## Decision protocol

- Do not contradict an accepted ADR. Create a superseding ADR if a decision needs to change.
- Separate facts, assumptions, proposals, and accepted decisions in every design discussion.
- Do not turn founder context into product-specific code. Adarsh is the first power user; CareerOS serves many users.
- Preserve user agency: prepare, recommend, draft, and remind, but do not auto-apply or send bulk outreach.
- Use the minimum personal data necessary and retain clear provenance and consent for imported data.

## Implementation protocol

- Start from a coherent vertical slice, not disconnected screens or placeholders.
- Keep source integrations behind plugins/adapters with explicit capability and permission checks.
- Use canonical domain models; normalize external data before business logic uses it.
- Make ranking inputs, weights, confidence, and explanations inspectable.
- Treat AI output as assistive, reviewable content; validate structured output and provide non-AI fallbacks where practical.
- Add tests for tenant boundaries, authorization, and behavior involving any user data or external credential.

## Documentation protocol

- Update Product Memory for confirmed product decisions.
- Add or supersede an ADR for an architecture or durable product decision.
- Update a PRD for new or changed requirements.
- Update the roadmap when a milestone becomes active, blocked, or complete.
