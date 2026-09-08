# CareerOS Project Manifest

**Product:** CareerOS — Career Operating System
**Stage:** Active Development — Core vertical slice operational
**Last updated:** 2026-09-08

## Purpose

CareerOS helps people run a deliberate, effective job search. It automates repetitive research and organization so users can focus on thoughtful applications, meaningful networking, interview preparation, and career decisions.

CareerOS is not a job board and never optimizes for application volume. It is a multi-tenant Career Operating System that prioritizes interview probability, decision quality, time savings, organization, and networking effectiveness.

## Product principles

1. **User control:** CareerOS does not auto-apply, bulk-send outreach, or make decisions for users.
2. **Privacy and consent:** Use only user-provided data, public information, or data acquired through authorized integrations. Protect user data and credentials.
3. **Explainability:** Every score and AI recommendation must say why it was made and support user override.
4. **Modularity:** Core modules communicate via APIs/events and remain independently evolvable.
5. **Bring Your Own Keys:** Users may connect their own AI and integration credentials; provider use is opt-in. BYOK is never mandatory — platform-level AI configuration and fully offline functionality are both supported.
6. **Open and portable:** The product is open source, self-hostable, cloud deployable, and avoids unnecessary lock-in.
7. **Evidence over activity:** Measure outcomes, not just completed tasks.
8. **Zero fabricated intelligence:** AI features return honest capability-unavailable responses rather than fake statistics or advice when AI is not configured.

## What is currently implemented

### Operational (no AI required)

- Authentication via Better Auth (email/password, organization sessions)
- Multi-tenant workspace model with data isolation
- Multi-field onboarding (not SWE-only — supports Healthcare, Finance, Research, Design, etc.)
- Master Career Profile: experience, education, skills, technologies, projects, achievements, certifications, publications, hackathons, links
- Nested record UUID normalization (client temporary IDs sanitized to canonical UUIDs)
- Resume Profiles: named persistent resumes per career direction, LaTeX source auto-generated, section priority (skills, projects, experience, achievements, certifications)
- Resume Versions: audit snapshot records attached to Resume Profiles
- Resume import via `.tex` source
- Resume file parsing (PDF/DOCX/TXT) with heuristic extraction
- Job Radar: ingestion, normalization, SHA-256 deduplication, multi-dimensional deterministic matching, workspace job states (save, dismiss, restore, apply)
- Apify LinkedIn adapter for job discovery; APIFY_API_TOKEN supported at platform level
- Applications CRM: full lifecycle (saved → applied → screening → interview → offer → rejected/withdrawn), status history, notes, resumeProfileId reference
- BYOK encrypted credential storage (AES-256-GCM) for workspace-level AI keys
- Career Handbook: static offline reference for 7 career fields (Software Engineering, Data Analysis, Product Management, Design, Research, Healthcare, Finance)

### Capability-Dependent (requires AI provider)

- AI Capability Resolution Layer: workspace BYOK → platform env vars → honest unavailable state
- AI Coach: role analysis, section-level coaching (summary, experience, projects, skills, education), apply recommendations to Resume Profile (Master Career Profile never modified)
- AI Market Intelligence: analyzes ingested job data (requires both ingested jobs and AI capability)
- AI-enhanced resume parsing (falls back to heuristics without AI)

### Not yet implemented

- LaTeX PDF compilation (LaTeX source stored; external compiler not yet integrated)
- Resume Studio full editor UI
- Cover letter templates and personalization
- Outreach Intelligence (ethical outreach drafts, templates)
- Relationship Intelligence (contact graph, alumni discovery)
- Company Intelligence workspace
- Career Analytics
- Interview Intelligence
- GitHub / LinkedIn evidence integrations
- Billing, hosted AI subscriptions

## Module scope

| Module | Responsibility |
| --- | --- |
| Job Radar | Ingest, normalize, deduplicate, score, rank, and explain job recommendations |
| Resume Intelligence | Maintain Master Career Profile, Resume Profiles, LaTeX source, matching, and optional AI-assisted tailoring |
| Application CRM | Track the full lifecycle and artifacts of each user-led application |
| AI Coach | Optional, capability-aware coaching grounded in Master Career Profile evidence |
| Insights | AI Market Intelligence (capability-dependent) and Career Handbook (offline) |
| BYOK | Encrypted user-specific AI and integration credential storage |
| Workspace | Multi-tenant organization, onboarding, and workspace management |

## Technology stack

| Layer | Technology |
| --- | --- |
| Monorepo | Turborepo + pnpm |
| Frontend | Next.js 16, React 19, Tailwind CSS v4, TypeScript |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL, Prisma v7 |
| Authentication | Better Auth v1.4 |
| Job Ingestion | Apify LinkedIn adapter |
| AI Providers | OpenRouter, OpenAI, Anthropic (direct HTTP; no vendor SDK) |

## Architecture

The system is a monorepo with a Next.js web client and a NestJS API backed by PostgreSQL.

```text
apps/web     — Next.js frontend
apps/api     — NestJS API + Prisma
packages/*   — Shared types, utilities
```

See [`docs/architecture/System_Architecture.md`](../architecture/System_Architecture.md) for the full architecture reference.

## Documentation index

- Product decisions: `docs/decisions/Product_Memory.md`
- Architecture: `docs/architecture/System_Architecture.md`
- Feature delivery status: `docs/roadmap/Feature_Delivery_Status.md`
- Implementation checklist: `docs/roadmap/Implementation_Checklist.md`

## Required workflow for contributors and agents

1. Read the documents listed in `AGENTS.md`.
2. Inspect existing code before modifying it. Treat source code as the source of truth.
3. Check the Prisma schema and migrations before touching database-related code.
4. Never assume that having a Better Auth session means an active organization exists — verify `activeOrganizationId`.
5. Never perform destructive database operations without explicit approval.
6. Run `pnpm lint`, `pnpm check-types`, and `pnpm build` before declaring work complete.
7. Inspect `git status` and `git diff` before finishing.
8. Do not commit changes unless explicitly asked.

## Definition of done

A feature is complete only when it has user-visible value, respects the product principles, has appropriate tests, handles permissions and errors, provides an explanation where it ranks or recommends, and is reflected in the relevant documentation.
