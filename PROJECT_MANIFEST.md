# CareerOS Project Manifest

**Product:** CareerOS — Your AI Career Intelligence Platform  
**Stage:** Phase 0 complete; Phase 1 foundation next  
**Last updated:** 2026-07-21

## Purpose

CareerOS helps people run a deliberate, effective job search. It automates repetitive research and organization so users can focus on thoughtful applications, meaningful networking, interview preparation, and career decisions.

CareerOS is not a job board and never optimizes for application volume. It is a multi-tenant Career Operating System that prioritizes interview probability, decision quality, time savings, organization, and networking effectiveness.

## Product principles

1. **User control:** CareerOS does not auto-apply, bulk-send outreach, or make decisions for users.
2. **Privacy and consent:** Use only user-provided data, public information, or data acquired through authorized integrations. Protect user data and credentials.
3. **Explainability:** Every score and AI recommendation must say why it was made and support user override.
4. **Modularity:** Core modules communicate via APIs/events and remain independently evolvable.
5. **Bring Your Own Keys:** Users connect their own AI and integration credentials; provider use is opt-in.
6. **Open and portable:** The product is open source, self-hostable, cloud deployable, and avoids unnecessary lock-in.
7. **Evidence over activity:** Measure outcomes, not just completed tasks.

## Current scope

### Core modules

| Module                    | Responsibility                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| Job Intelligence          | Ingest, normalize, deduplicate, score, rank, and explain job recommendations.            |
| Resume Intelligence       | Maintain master career data, resume profiles, versions, matching, and generation.        |
| Application CRM           | Track the complete lifecycle and artifacts of each user-led application.                 |
| Outreach Intelligence     | Recommend ethical next actions and generate reviewable, personalized drafts.             |
| Relationship Intelligence | Maintain a user-owned relationship graph, contact history, referrals, and follow-ups.    |
| Company Intelligence      | Organize public company knowledge, roles, tech, hiring context, and notes.               |
| Interview Intelligence    | Support company- and role-specific preparation.                                          |
| Career Analytics          | Measure application, resume, outreach, and interview outcomes.                           |
| Learning Intelligence     | Recommend high-ROI skills using job-market evidence and goals.                           |
| Plugin System             | Isolate external platforms, providers, and integrations behind permissions and adapters. |

### Phase 1 foundation

1. Authentication: Google, GitHub, and email; Microsoft and university SSO later.
2. Multi-tenant user and workspace model with data isolation.
3. Master Career Profile and multiple resume profiles.
4. Resume metadata, versioning, and a future generation pipeline.
5. User settings and encrypted BYOK connections.
6. Dashboard shell, navigation, and module boundaries.
7. Auditability, consent, and baseline security.

## Architecture direction

The target architecture is a modular monorepo with a web client, an API service, background workers, PostgreSQL, Redis, and a plugin layer. The specific stack remains a proposed decision until ADR-010 is accepted; no production implementation should silently assume a framework.

All modules must use explicit contracts. Cross-module side effects should be emitted as domain events so a feature can evolve without tightly coupling every module.

## Documentation index

- Product memory: `docs/decisions/Product_Memory.md`
- Decision records: `docs/adr/`
- Product requirements: `docs/prd/`
- Architecture: `docs/architecture/`
- Delivery plan: `docs/roadmap/`

## Required workflow for contributors and agents

1. Read the documents listed in `AGENTS.md`.
2. Identify the module owner, data boundaries, permissions, and relevant ADRs.
3. Propose a new ADR before making a material technical or product decision.
4. Implement the smallest complete change with tests and documentation.
5. Verify behavior, access control, explainability, and user control.
6. Update the roadmap and Product Memory when the project state changes.

## Definition of done

A feature is complete only when it has user-visible value, respects the product principles, has appropriate tests, handles permissions and errors, provides an explanation where it ranks or recommends, and is reflected in the relevant documentation.
