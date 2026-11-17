# CareerOS — Post-Stabilization Architectural Review

**Audit Date:** November 2026  
**Audited Baseline Commit:** `137fa91` (`stabalization pass 5 final audit`)  
**Scope:** Structural architecture, module boundaries, database models, security, and infrastructure requirements for the upcoming MVP.

---

## 1. Executive Structural Verdict

The CareerOS architectural foundation is **sound, cohesive, and resilient**. The five stabilization passes systematically eliminated the major historical architectural hazards:
- Dual-database complexity (CockroachDB vs PostgreSQL) was entirely resolved in favor of PostgreSQL 17 with `@prisma/adapter-pg`.
- Custom JWT auth was replaced with Better Auth v1.4 database-backed sessions.
- Multi-tenancy is enforced through `WorkspaceMemberGuard` and compound foreign keys.
- Next.js 16 deprecated conventions were modernized to `proxy.ts`.

**No architectural rewrite is warranted.** The existing architecture adequately supports the planned MVP. What the codebase requires is **feature-level wiring, endpoint exposure, and UX integration**, not foundational changes.

---

## 2. Monorepo & Module Boundaries

### Monorepo Structure
```text
CareerOS/
├── apps/
│   ├── api/                 (NestJS API, Prisma v7, Better Auth)
│   └── web/                 (Next.js 16 Turbopack, React 19, Tailwind CSS v4)
├── packages/
│   ├── eslint-config/       (Shared ESLint configs)
│   ├── types/               (Shared DTOs, contracts, LaTeX utilities)
│   ├── typescript-config/   (Base tsconfigs)
│   └── utils/               (Shared helpers)
└── tooling/
    └── scripts/             (Monorepo utility scripts)
```
- **Boundary Evaluation:** Strong. The dependency graph flows downward from `apps/*` into `packages/*`. `packages/types` serves as the single source of truth for contracts shared across the frontend and backend, notably `MasterCareerProfileInput`, `ResumeProfile`, `JobOpportunity`, and the LaTeX compilation contracts.
- **Identified Concern (Minor):** `packages/types/package.json` triggers a non-failing Node warning `[MODULE_TYPELESS_PACKAGE_JSON]` during lint because it lacks `"type": "module"`. This is cosmetic and does not affect type generation.

### NestJS Backend Module Cohesion
`apps/api/src/app.module.ts` registers 10 domain modules:
1. `DatabaseModule`: Global lazy Prisma client using PostgreSQL 17.
2. `CareerOsThrottlerModule`: Rate-limiting with Redis storage and in-memory fallback.
3. `AuthModule`: Better Auth instance and session lifecycle.
4. `WorkspaceModule`: Onboarding, organization provisioning, and workspace queries.
5. `ByokModule`: AES-256-GCM credential storage and AI capability resolution.
6. `CareerProfileModule`: Master Career Profile storage with optimistic versioning.
7. `ResumeProfileModule`: Named Resume Profiles, versions, and heuristic/AI parsing.
8. `JobsModule`: Canonical job repository, LinkedIn Apify ingestion, and deterministic matching.
9. `ApplicationsModule`: Application CRM lifecycle and status history.
10. `AiCoachModule`: Role/section analysis and section-level recommendations.
11. `InsightsModule`: Market intelligence and offline career handbook.

- **Module Boundary Evaluation:** Clean and decoupled. Services communicate via standard NestJS dependency injection. Cross-domain queries are mediated through repository interfaces.

---

## 3. Next.js 16 App Router & BFF Design

### Pattern Analysis
All browser interactions communicate through Next.js Backend-for-Frontend (BFF) route handlers located at `apps/web/app/api/*`.
- **Session Validation:** `getBffSession()` (`apps/web/lib/bff.ts`) extracts the Better Auth session token from cookies, validates that an active organization exists, and extracts `session.workspace.id`.
- **Error Propagation:** `handleBffError()` inspects upstream `ApiError` instances and preserves HTTP status codes (400, 401, 403, 404, 409, 422, 429, 500), mapping network disconnects to 502 Bad Gateway.
- **Proxy Guard:** `apps/web/proxy.ts` operates on all protected routes (`/dashboard`, `/jobs`, `/resumes`, `/applications`, `/career`, `/coach`, `/insights`, `/settings`). It cleanly redirects unauthenticated visitors to `/login?next=...` with zero Next.js 16 deprecation warnings.

### Architectural Gap in the BFF
- `apps/web/app/api/jobs/route.ts` only exports a `GET` handler.
- When expanding Job Radar to support manual job entry (Task T-01), the BFF must export a `POST` handler forwarding to the NestJS API with session credentials.

---

## 4. Multi-Tenancy & Better Auth Session Integrity

### Tenancy Model
CareerOS uses an **Organization-Centric Multi-Tenant Model**:
- Every piece of personal or job-search data (`MasterCareerProfile`, `ResumeProfile`, `ResumeVersion`, `WorkspaceJobState`, `JobMatch`, `Application`, `ByokCredential`) has a foreign key to `Organization.id`.
- Canonical jobs in the `jobs` table are shared globally (identified by fingerprint or external source ID). Workspace-specific interactions (saved, dismissed, notes, application status) live in `WorkspaceJobState` and `Application`, isolated by `organizationId`.

### Protection Guarantees
- `BetterAuthGuard` applies globally via `APP_GUARD`, rejecting unauthenticated requests.
- `WorkspaceMemberGuard` applies to all `/workspaces/:workspaceId/*` routes. It resolves the caller's `user.id` against the database `Member` table for the specified `workspaceId`. Attempting to access another organization's workspace ID yields HTTP 403 Forbidden.
- **Rule Verification:** "Never assume session = active organization." The guards and BFF handlers explicitly check `session.activeOrganizationId`.

---

## 5. Prisma Data Model & PostgreSQL Design

### Strengths
1. **Compound Constraints for Data Integrity:**
   - `resume_versions`: `@@unique([id, organizationId])` and compound foreign key `(resume_profile_id, organization_id)`. Prevents cross-tenant snapshot leakage.
   - `job_matches`: `@@unique([organizationId, jobId, resumeProfileId])`. Prevents duplicate score entries.
   - `applications`: `@@unique([organizationId, jobId])`. Enforces one tracked application per job per workspace.
   - `jobs`: `@@unique([fingerprint])` and `@@unique([source, externalId])`. Ensures SHA-256 deduplication.
2. **Optimistic Concurrency:**
   - `MasterCareerProfile` maintains an integer `version` field incremented atomically on updates, preventing concurrent edits from overwriting each other.

### Recommendations for Upcoming MVP Slices
1. **Application Follow-Up Columns:**
   - Add nullable fields `deadlineAt`, `followUpAt`, and `interviewDate` to `Application` via a standard Prisma migration.
2. **Contacts & Interview Round Models (P2):**
   - For P2 CRM features, introduce `ApplicationContact` and `InterviewRound` tables with cascade deletion on `applicationId`.

---

## 6. AI Capability Layer & BYOK Abstraction

### Architecture
All AI interactions (Resume Parsing, AI Coach, Market Intelligence) flow through `AiCapabilityService.resolveCapability(workspaceId)`.

```text
Request ──> AiCapabilityService.resolveCapability(workspaceId)
                 │
                 ├── 1. Check Workspace BYOK (AES-256-GCM decrypted key)
                 │      (OpenAI, Anthropic, Google, Mistral)
                 │
                 ├── 2. Fallback to Platform Env Vars
                 │      (OPENROUTER_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY)
                 │
                 └── 3. Fallback to Honest Unavailable State
                        ({ available: false, reason: "..." })
```

### Architectural Virtues
1. **Zero Vendor SDK Lock-In:** Direct HTTP fetch calls to OpenAI-compatible or Anthropic REST APIs. No bloated vendor SDK dependencies (`@google/generative-ai`, `openai`, `@anthropic-ai/sdk`).
2. **Honest Degradation:** Core features (Career Profile editing, LaTeX rendering, deterministic job matching, application tracking, career handbook) operate 100% offline without any AI provider configured.
3. **Master Profile Immutability:** AI suggestions write only to `ResumeProfile.prioritySkillIds` or the profile's LaTeX template. The Master Profile is never mutated by an AI response.

---

## 7. Job Ingestion Architecture

### Pipeline Flow
```text
Raw Ingestion (Apify / Manual / Seed)
      │
      ▼
JobNormalizationService
      │ (normalizes title, company, location, remote policy, skills, employment type)
      ▼
JobDeduplicationService
      │ (computes SHA-256 fingerprint: lowercase(company|title|location))
      ▼
PrismaJobsRepository.upsertCanonicalJob()
      │ (persists canonical job)
      ▼
JobMatchingService.match()
      │ (deterministic scoring against Master Career Profile)
      ▼
Persisted JobMatch & WorkspaceJobState
```

### Architectural Gap
The pipeline currently only has an adapter for Apify (`ApifyLinkedInAdapter`) and the static seed pipeline.
**Required Architectural Correction:**
- Create a `ManualJobAdapter` or expose `JobsService.createJob` directly through `JobsController` so that the normalization and deduplication pipeline handles user-pasted job descriptions identically to scraped jobs.

---

## 8. Document Handling & Resume Asset Strategy

### Core Product Decision: LaTeX-First Document Pipeline
CareerOS rejects the model of "AI rewriting the resume into a generic template".
- **Source of Truth:** The user's LaTeX code is stored directly in `ResumeProfile.styleSettings.latexSource`.
- **Generation:** If a profile is created from scratch, `generateLatexFromProfile` generates a canonical Computer Modern resume template from the Master Profile.
- **In-Browser Compilation:** `apps/web/lib/latex-engine.ts` (`compileLatexToHtml`) parses LaTeX commands (`\section`, `\textbf`, `\textit`, tabular environments) and renders an authentic Computer Modern HTML document inside the browser.
- **PDF Export:** Triggering `window.print()` allows modern browsers (Chrome, Edge, Safari) to generate a pixel-perfect vector PDF without server-side LaTeX compilation overhead.

### Evaluation of Headless PDF Compilers (pdflatex / Typst)
- A server-side compiler requires bundling a ~1.5 GB TeX Live distribution or installing a containerized Typst binary.
- For the MVP, this introduces operational fragility, memory overhead, and security attack surface (shell escape risks in LaTeX).
- **Recommendation:** Defer server-side PDF compilation to P3. Browser-based HTML-to-PDF rendering and LaTeX source download fully satisfy the MVP requirements.

---

## 9. Background Processing & Storage Architecture

### Infrastructure Rejection Matrix

| Infrastructure | Proposal Status | Justification |
|---|---|---|
| **Trigger.dev / BullMQ** | **DEFERRED (P3)** | CareerOS request payloads are lightweight. Normalization, deterministic matching, and AI coach calls execute in < 2.5s. Ingestion batches are bounded. Introducing a distributed queue service adds operational friction without immediate necessity. |
| **Cloudflare R2 / AWS S3** | **DEFERRED (P3)** | Resumes are stored as text (LaTeX) and JSON snapshots in PostgreSQL. Imported resume uploads (PDF/DOCX) are parsed ephemerally in memory to extract text and are not retained as raw files. Object storage is completely unnecessary for the MVP. |
| **Sentry / PostHog** | **DEFERRED (P3)** | Product analytics and third-party APMs can be integrated post-alpha. Structured logging via NestJS Logger and Next.js proxy error logs currently suffice. |

---

## 10. Summary of Architectural Recommendations

### Mandatory Corrections (Pre-Launch)
1. **Expose Custom Job Ingestion in API:** Add `POST /workspaces/:id/jobs` and wire `JobsService.createJob` with automatic normalization and matching.
2. **Expose Job Creation in BFF:** Add `POST /api/jobs` in Next.js BFF.
3. **Connect Drawer Navigation to Resume Versions:** Ensure `job-details-drawer.tsx` links directly to the generated version snapshot.

### Optional Enhancements (Post-Launch)
1. Add `deadlineAt` and `followUpAt` nullable columns to `Application`.
2. Add `ApplicationContact` model for recruiter tracking.
3. Add multi-format download (.tex, .html, .md) to Resume Studio.
