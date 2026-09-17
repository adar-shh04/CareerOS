# CareerOS Technical Execution Plan

> **Status:** Living Document
> **Project:** CareerOS
> **Goal:** Build an open-source, self-hostable, multi-tenant AI Career Operating System.

---

## 1. Vision & Purpose

CareerOS enables users to run a deliberate, structured, and high-probability job search from one unified platform. It automates repetitive research, normalization, and organization so candidates can focus their judgment on thoughtful applications, tailored resumes, interview preparation, and career decisions.

### Core User Capabilities

- **Master Career Truth:** Maintain a verified canonical profile of all experiences, skills, projects, and credentials.
- **Resume Profiles:** Maintain named, persistent resume configurations with automated LaTeX generation rather than disposable copies.
- **Job Radar:** Ingest, normalize, deduplicate, and score job opportunities deterministically against verified profile evidence.
- **Explainable Matching:** Understand exactly why a job matches or where skill gaps exist with multi-dimensional scoring.
- **Applications CRM:** Track the end-to-end application lifecycle with notes, stages, and resume profile linkages.
- **AI Coach & Intelligence:** Optional, capability-grounded role coaching that never fabricates data or overwrites the Master Profile.
- **Self-Hostable & Portable:** Full Docker-based local development, clear environment variable boundaries, and zero proprietary cloud lock-in.

---

## 2. Engineering Principles

- **Simplicity Over Cleverness:** Prefer clear, maintainable patterns over speculative abstractions.
- **Explainability First:** Every score, match, and recommendation must surface its evidence and allow user override.
- **No Fabricated Intelligence:** AI features return honest capability-unavailable responses when providers are not configured.
- **Deterministic Core:** Matching, deduplication, profile storage, and application tracking function fully without AI.
- **Strict Tenant Isolation:** Every entity is scoped to an `organizationId`; request boundaries are enforced at the API guard layer.
- **Preserve User Agency:** Assist, prepare, draft, and remind; never auto-apply or send bulk outreach on behalf of users.
- **Quality Gates:** Zero TypeScript diagnostic errors, zero lint warnings, and passing test suites before merging.

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Monorepo** | Turborepo + pnpm | Workspace management, caching, and task pipelines |
| **Frontend** | Next.js 16 (React 19) | App Router, Server/Client components, Tailwind CSS v4 |
| **Backend** | NestJS | Modular REST API, dependency injection, validation guards |
| **Database** | PostgreSQL 16 + Prisma v7 | Relational persistence, `@prisma/adapter-pg`, linear migrations |
| **Authentication** | Better Auth v1.4 | Session validation, organization plugin, multi-tenant context |
| **AI Providers** | OpenRouter / OpenAI / Anthropic | Capability-resolved direct HTTP client (no heavy vendor SDKs) |
| **BYOK Encryption** | Node.js `crypto` (AES-256-GCM) | Encrypted workspace-level API credential storage |
| **Resume Parser** | `pdf-parse` + Heuristics | Multi-format text extraction with optional AI enhancement |
| **Job Discovery** | Apify LinkedIn Scraper | Scheduled and on-demand job ingestion with offline sample fallback |

---

## 4. Module Execution Roadmap

### 4.1 Authentication & Multi-Tenancy
- [x] Better Auth email/password authentication and session lifecycle.
- [x] Multi-tenant organization schema and workspace resolution via `session.activeOrganizationId`.
- [x] `BetterAuthGuard` enforcing authenticated tenant context on API requests.
- [x] Multi-field onboarding flow initializing Master Career Profile and starter Resume Profile.
- [ ] Role-based organization permissions (Owner, Admin, Member).

### 4.2 Master Career Profile
- [x] Canonical domain schema for identity, experience, education, skills, projects, achievements, certifications, and links.
- [x] Transactional persistence with atomic version increments in PostgreSQL.
- [x] Frontend temporary ID normalization to UUIDs on ingestion.
- [x] Master Profile full CRUD editor in frontend (`/career`).
- [ ] Public shareable profile projection with user-controlled visibility.

### 4.3 Resume Intelligence
- [x] Named Resume Profiles per career direction (e.g. "Staff Engineer", "Data Analyst").
- [x] Section priority customization (skills vs. experience vs. projects).
- [x] LaTeX template generator producing ATS-optimized LaTeX source.
- [x] LaTeX source import endpoint (`/workspaces/:id/resume-profiles/import-latex`).
- [x] Immutable `ResumeVersion` snapshot records for audit history.
- [x] Multi-format resume parsing (PDF, DOCX, TXT) with heuristic extractor.
- [ ] Integrated external LaTeX-to-PDF compilation pipeline.
- [ ] Full drag-and-drop Resume Studio visual editor.

### 4.4 Job Radar & Matching Engine
- [x] Ingestion adapter for Apify LinkedIn scraper with offline mock fallback.
- [x] Normalization pipeline extracting salary ranges, workplace types, and skills.
- [x] SHA-256 fingerprinting on `(company, title, location)` for robust deduplication.
- [x] Deterministic multi-dimensional matching engine (overall, skill, role, experience, location, seniority).
- [x] Workspace job interaction states (saved, dismissed, restored, applied).
- [x] Job Radar drawer UI with detailed match score explanations and skill breakdowns.
- [ ] Additional ingestion providers (Indeed, Greenhouse, Lever).

### 4.5 AI Coach & Market Intelligence
- [x] AI Capability Resolution Layer: checks workspace BYOK credentials, then platform keys, else returns honest unavailable status.
- [x] AES-256-GCM encrypted storage for user-supplied BYOK credentials.
- [x] Role analysis evaluating match gaps between Master Profile and targeted job descriptions.
- [x] Section-level coaching recommendations with one-click apply to Resume Profiles (never modifies Master Profile).
- [x] AI Market Intelligence synthesizing demand trends from real ingested jobs.
- [ ] Cover letter generation grounded in verified profile evidence.

### 4.6 Applications CRM
- [x] Durable application entities tracking job, status, stage notes, and applied timestamps.
- [x] Direct linkage to `resumeProfileId` for provenance.
- [x] Stage transition history auditing candidate pipeline progress.
- [x] Kanban and list views in frontend (`/applications`).
- [ ] Follow-up reminder automation and interview scheduling.

### 4.7 Career Handbook
- [x] Offline reference guide covering 7 major career fields (SWE, Data, PM, Design, Research, Healthcare, Finance).
- [x] Zero AI dependency; permanently available educational resource.
- [ ] Community contribution framework for field guide expansion.

---

## 5. Architectural Invariants

1. **Isolation First:** No database query may execute without an explicit `organizationId` filter.
2. **Master Profile Integrity:** AI features are strictly read-only consumers of the Master Career Profile. Only direct user edits may modify canonical career evidence.
3. **No Hidden Costs:** Core platform workflows (job search, matching, CRM, resume profile generation) must remain 100% functional without an active AI key.
4. **No Unsafe Execution:** Database seeds, migrations, and scripts must never utilize hardcoded passwords or leak credentials to standard output.
5. **Clean Workspace Dependencies:** Monorepo packages must maintain strict dependency boundaries with zero circular references or dead boilerplate packages.