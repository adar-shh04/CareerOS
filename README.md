# CareerOS

CareerOS is an open-source, self-hostable, multi-tenant **Career Operating System** built to reduce repetitive job-search work while increasing interview probability, decision quality, organization, and user control.

CareerOS is **not** a job board, a bulk-apply bot, or a one-size-fits-all AI resume generator. It is a structured platform that gives users full control over their career data, applications, and AI usage.

> **Guiding rule:** Does this reduce repetitive work while increasing interview probability? If not, it does not belong in CareerOS.

---

## Core Principles

- **User control** — CareerOS never auto-applies, never bulk-sends outreach, and never makes decisions on the user's behalf.
- **Verified evidence** — The Master Career Profile is the source of verified career truth. AI recommendations are grounded in it and cannot corrupt it.
- **Persistent Resume Profiles** — Users maintain a small number of named Resume Profiles (e.g. "SDE Resume", "Data Analyst Resume") rather than hundreds of disposable snapshots.
- **LaTeX-first resume architecture** — Each Resume Profile carries a canonical LaTeX source. The generator and section-update utilities use a custom LaTeX template system (not a full external LaTeX engine).
- **Deterministic core without AI** — Job matching, deduplication, profile management, application tracking, and the Career Handbook work without any AI configuration.
- **Optional AI capabilities** — AI features (AI Coach, AI Market Intelligence, resume parsing) activate only when an AI provider is configured. Core functionality is never blocked on AI.
- **BYOK is strictly optional** — Users may connect their own API keys (OpenAI, Anthropic, Google, Mistral) or rely on platform-level AI configuration. Neither is required to use CareerOS.
- **Capability-aware UX** — Every AI-dependent feature returns an honest, actionable message when capability is unavailable rather than failing silently or returning fabricated output.
- **Multi-field support** — CareerOS supports users across Software Engineering, Data Analysis, Product Management, Design, Research, Healthcare, Finance, and other fields. It does not assume Software Engineering.

---

## Current Features

### Operational (no AI required)

| Feature | Description |
|---|---|
| Authentication | Email/password via Better Auth; multi-tenant organization model |
| Workspace & Onboarding | Workspace creation, multi-field onboarding (field, role, skills, location), Master Profile + Resume Profile seeded automatically |
| Master Career Profile | Full CRUD for identity, experience, education, skills, technologies, projects, achievements, certifications, publications, hackathons, links |
| Resume Profiles | Named persistent profiles per career direction; LaTeX source auto-generated at creation; section priority (skills, projects, experience) |
| Resume Versions | Snapshot records attached to a Resume Profile (used for audit/history); applications can reference `resumeProfileId` directly |
| Resume Import | `POST /workspaces/:id/resume-profiles/import-latex` — import existing `.tex` source into a named Resume Profile |
| Resume Parsing | File upload (PDF/DOCX/TXT) with heuristic extraction; AI-enhanced extraction when capability is available |
| Job Radar | Job listing, filtering (remote, location, skills), search, save, dismiss, restore, job detail drawer |
| Job Matching | Deterministic multi-dimensional scoring (skill, role, experience, location, seniority) against Master Career Profile |
| Job Ingestion | Apify LinkedIn scraper adapter; SHA-256 fingerprint deduplication; job normalization pipeline |
| Job Application | `POST /workspaces/:id/jobs/:jobId/apply` — marks application, records `resumeProfileId`, tracks `appliedAt` |
| Applications CRM | Full application lifecycle: saved → applied → screening → interview → offer → rejected/withdrawn; status history; notes |
| BYOK Credential Storage | Encrypted storage (AES-256-GCM) for workspace-level AI provider keys |
| Career Handbook | Static offline educational reference for 7 career fields (SWE, Data Analysis, PM, Design, Research, Healthcare, Finance) |

### Capability-Dependent (requires AI provider configuration)

| Feature | Requires |
|---|---|
| AI Coach — Role Analysis | AI provider (BYOK or platform) + Master Career Profile |
| AI Coach — Section Coaching | AI provider + Master Career Profile |
| AI Coach — Apply Recommendations | AI provider + target Resume Profile |
| AI Market Intelligence | AI provider + ingested jobs in the database |
| AI-enhanced Resume Parsing | AI provider (falls back to heuristics if unavailable) |

### Partial / Prototype

| Feature | Status |
|---|---|
| LaTeX PDF export | LaTeX source stored and section-updated; external compilation not yet integrated |
| Resume Studio UI | Shell exists in frontend; full editor not yet built |
| Cover letter | Not yet implemented |
| Outreach & Relationship Intelligence | Not yet implemented |
| Company Intelligence | Not yet implemented |
| Career Analytics | Not yet implemented |
| Interview Intelligence | Not yet implemented |

---

## Architecture Overview

```text
User
 │
 ├── Authentication (Better Auth)
 │       └── Multi-tenant Organizations + Sessions
 │
 ├── Onboarding
 │       └── Field, role, skills, location → seeds Master Profile + Resume Profile
 │
 ├── Master Career Profile (Verified Career Truth)
 │       └── Experience, Education, Skills, Projects, Achievements,
 │           Certifications, Publications, Hackathons, Links
 │
 │         ↓  (referenced by, not overwritten by)
 │
 ├── Resume Profiles (Persistent Named Resumes)
 │       ├── Section priority (skills, experience, projects)
 │       ├── LaTeX source (canonical template auto-generated)
 │       ├── Resume Versions (audit snapshots)
 │       └── Import: .tex source
 │
 ├── Job Radar
 │       ├── Ingestion (Apify LinkedIn adapter)
 │       ├── Normalization
 │       ├── SHA-256 Deduplication
 │       ├── Deterministic Multi-Dimensional Matching
 │       └── Workspace Job State (save, dismiss, restore, apply)
 │
 ├── Applications CRM
 │       └── Status lifecycle + history; references resumeProfileId directly
 │
 ├── AI Capability Layer
 │       ├── Workspace BYOK (openai, anthropic, google, mistral)
 │       ├── Platform AI (OPENROUTER_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY)
 │       └── Honest unavailable state (no fabrication)
 │
 ├── AI Coach (capability-dependent)
 │       ├── Role analysis grounded in Master Career Profile
 │       ├── Section-level coaching (summary, experience, projects, skills, education)
 │       └── Apply recommendations → updates Resume Profile only
 │
 └── Insights
         ├── AI Market Intelligence (capability-dependent + requires ingested jobs)
         └── Career Handbook (static, offline, 7 career fields)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | Turborepo + pnpm |
| Frontend | Next.js 16, React 19, Tailwind CSS v4, TypeScript |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL (via Docker), Prisma v7 ORM |
| Authentication | Better Auth v1.4 (email/password, organization plugin) |
| Job Ingestion | Apify LinkedIn scraper (via REST API) |
| AI Providers | OpenRouter, OpenAI, Anthropic (direct HTTP; no SDK dependency) |
| BYOK Encryption | AES-256-GCM via Node.js `crypto` |
| Resume Parsing | `pdf-parse@2.4.5` for PDF extraction; heuristic text parsing |

---

## Local Development

### Prerequisites

- Node.js ≥ 18
- pnpm 9.x
- Docker (for PostgreSQL)

### Setup

```bash
# Clone and install dependencies
git clone https://github.com/adar-shh04/CareerOS.git
cd CareerOS
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with required values (see Environment Variables below)

# Start the database
docker-compose -f docker-compose.dev.yml up -d

# Run database migrations
pnpm --filter careeros-api db:migrate:dev

# Start development servers
pnpm dev
```

Frontend runs at `http://localhost:3000`.
API runs at `http://localhost:3001`.

---

## Environment Variables

### Required

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `DIRECT_URL` | Direct PostgreSQL URL (for Prisma migrations) |
| `BETTER_AUTH_SECRET` | Random secret for Better Auth session signing |
| `BETTER_AUTH_URL` | API base URL (default: `http://localhost:3001`) |
| `BYOK_ENCRYPTION_KEY` | 32-byte hex key for encrypting BYOK credentials |
| `NEXT_PUBLIC_APP_URL` | Frontend URL (default: `http://localhost:3000`) |
| `CAREEROS_API_URL` | API URL used by the frontend (default: `http://localhost:3001`) |
| `CORS_ORIGIN` | Allowed CORS origin (default: `http://localhost:3000`) |

### Optional — AI Provider (Platform-Level)

If none of these are set, AI features return an honest capability-unavailable response. Users can also configure their own keys via BYOK.

| Variable | Description |
|---|---|
| `OPENROUTER_API_KEY` | Platform OpenRouter key (preferred) |
| `OPENROUTER_BASE_URL` | OpenRouter base URL (default: `https://openrouter.ai/api/v1`) |
| `OPENROUTER_DEFAULT_MODEL` | Model identifier (default: `openai/gpt-4o-mini`) |
| `OPENAI_API_KEY` | Platform OpenAI key (fallback) |
| `ANTHROPIC_API_KEY` | Platform Anthropic key (fallback) |

### Optional — Job Ingestion

| Variable | Description |
|---|---|
| `APIFY_API_TOKEN` | Apify token for LinkedIn job scraping |

### Optional — Infrastructure

| Variable | Description |
|---|---|
| `RESEND_API_KEY` | Email delivery (transactional emails) |
| `UPSTASH_REDIS_REST_URL` | Redis for caching / background jobs |
| `TRIGGER_SECRET_KEY` | Background job runner (Trigger.dev) |
| `POSTHOG_KEY` | Product analytics |
| `SENTRY_DSN` | Error monitoring |

---

## Current Implementation Status

See [`docs/roadmap/Feature_Delivery_Status.md`](docs/roadmap/Feature_Delivery_Status.md) for a detailed breakdown.

**Summary as of 2026-09-08:**

- Authentication, multi-tenancy, workspace/onboarding: **Operational**
- Master Career Profile (full CRUD): **Operational**
- Resume Profiles (LaTeX-first, section priority): **Operational**
- Job Radar (ingestion, matching, deduplication): **Operational**
- Applications CRM (lifecycle + history): **Operational**
- BYOK credential storage: **Operational**
- AI Capability Resolution Layer: **Operational**
- AI Coach (role analysis, section coaching, apply): **Operational (capability-dependent)**
- AI Market Intelligence: **Operational (capability-dependent + requires ingested jobs)**
- Career Handbook (7 fields): **Operational (offline)**
- LaTeX PDF compilation: **Not yet integrated (source stored; compiler not wired)**
- Resume Studio UI editor: **Partial (shell only)**
- Cover letter, Outreach, Company Intelligence, Analytics: **Not yet implemented**

---

## Start Here

1. Read [`PROJECT_MANIFEST.md`](PROJECT_MANIFEST.md) for product principles and scope.
2. Read [`AI_CONTEXT.md`](AI_CONTEXT.md) before using an AI coding agent.
3. Review [`docs/decisions/Product_Memory.md`](docs/decisions/Product_Memory.md) for confirmed product decisions.
4. Review [`docs/architecture/System_Architecture.md`](docs/architecture/System_Architecture.md) for architectural context.
5. See [`AGENTS.md`](AGENTS.md) for the required engineering workflow.
