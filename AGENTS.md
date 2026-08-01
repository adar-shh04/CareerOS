# CareerOS Agent Instructions

Before changing this repository, read the following in order:

1. `PROJECT_MANIFEST.md`
2. `docs/AGENT_HANDOFF.md` — current milestone, blockers, and next steps
3. `docs/decisions/Product_Memory.md`
4. Relevant files in `docs/adr/`
5. Relevant files in `docs/prd/`, `docs/architecture/`, and `docs/roadmap/`
6. The existing implementation and adjacent tests

## Non-negotiable rules

- CareerOS is a multi-tenant Career Operating System, not a job board.
- Never implement auto-application or mass outreach.
- Keep the user in control of sending, applying, and final decisions.
- Treat external systems as plugins or adapters; do not embed source-specific logic into core domain code.
- Every AI recommendation must expose understandable reasons and allow user override.
- Do not collect private contact details or violate source terms, privacy law, or user consent.
- Do not hardcode founder-specific data or credentials.
- Preserve module boundaries and use documented APIs/events for cross-module communication.
- Add or supersede an ADR whenever an architectural decision changes.
- Update the relevant PRD, roadmap, and Product Memory alongside a material product or architecture change.

## Working conventions

- Prefer small, coherent changes with focused tests.
- Use inclusive, precise language and protect user data by default.
- Keep secrets out of source control and logs.
- Favor deterministic rules for ranking where possible; use AI as an explainable enhancement, not an opaque gatekeeper.
