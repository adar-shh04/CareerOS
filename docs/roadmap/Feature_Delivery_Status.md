# CareerOS Feature Delivery Status

**Purpose:** The live feature inventory for implementation. Keep this file aligned with `Implementation_Checklist.md` and `Product_Memory.md` whenever scope changes.

**Last updated:** 2026-09-08  
**Current state:** Core vertical slice operational. AI layer, Job Radar, and Applications CRM implemented and tested.

---

## Product Guardrails

- [x] CareerOS is a career operating system, not a volume job board.
- [x] No automatic application submission.
- [x] No bulk or automated cold-email sending.
- [x] Every AI recommendation must be explainable and grounded in verified evidence.
- [x] Users review before any document, email, or message is used.
- [x] Multi-tenant, BYOK-optional, open-source, self-hostable direction implemented.
- [x] BYOK is never mandatory — platform AI config and offline functionality both supported.
- [x] No hardcoded fake market statistics or fabricated AI advice.
- [x] Multi-field support — does not assume Software Engineering.

---

## Foundation

- [x] Turborepo monorepo with Next.js `apps/web` and NestJS `apps/api`.
- [x] Docker Compose for web, API, and PostgreSQL.
- [x] GitHub repository (`adar-shh04/CareerOS`).
- [x] `pnpm` workspace with lint, type-check, test, and build scripts.
- [x] Environment variable example file (`.env.example`) — no secrets committed.
- [x] Better Auth v1.4 authentication (email/password, organization sessions).
- [x] Multi-tenant organization model — `Organization`, `Member`, `Session.activeOrganizationId`.
- [x] `BetterAuthGuard` (global) and `WorkspaceMemberGuard` (workspace routes).
- [x] PostgreSQL schema with Prisma v7 migrations.
- [x] Encrypted BYOK credential storage (`ByokCredential` — AES-256-GCM).
- [x] `ByokService` — store, retrieve, decrypt, delete provider keys per workspace.
- [x] Multi-field onboarding (`CompleteOnboardingDto`: name, workspaceName, field, targetRole, careerDirection, skills, locationPreference, workArrangement, jobSearchPreferences).
- [x] Workspace initialization seeds Master Career Profile and initial Resume Profile.

---

## Master Career Profile

- [x] Full data model: identity, experience, education, skills, technologies, projects, achievements, certifications, publications, hackathons, links.
- [x] Prisma-backed repository with workspace foreign key isolation.
- [x] Optimistic versioning (`version` integer, incremented on each save).
- [x] Client temporary ID normalization (e.g. `exp-1` → `randomUUID()`) — no validation errors thrown on client IDs.
- [x] `CareerProfileService.findByWorkspace()` and `save()`.
- [x] REST API: `GET/POST /workspaces/:id/career-profile`.

---

## Resume Intelligence

- [x] Named `ResumeProfile` model — multiple per workspace.
- [x] Section priority (prioritySkillIds, priorityProjectIds, priorityExperienceIds, priorityAchievementIds, priorityCertificationIds).
- [x] Canonical LaTeX source auto-generated at profile creation (`latex-template.util.ts`).
- [x] LaTeX stored in `styleSettings` JSON — no schema migration required.
- [x] `ResumeVersion` audit snapshots (masterProfileSnapshot, selectedRecordIds, jobAnalysisEvidence, matchResult, confidence, explanation).
- [x] Applications reference `resumeProfileId` directly — no `ResumeVersion` required for applying.
- [x] `POST /workspaces/:id/resume-profiles/import-latex` — import existing `.tex` source.
- [x] `POST /workspaces/:id/resume-profiles/parse` — upload PDF/DOCX/TXT; heuristic parsing with AI enhancement when available.
- [x] Resume Profile CRUD (`GET`, `POST`, `PUT`, `DELETE`).
- [x] Resume Version CRUD (`GET`, `POST /workspaces/:id/resume-profiles/:profileId/versions`).
- [ ] LaTeX PDF compilation — source stored; external compiler not yet integrated.
- [ ] Resume Studio full editor UI — shell exists; editor not built.
- [ ] Cover letter templates.

---

## Job Radar

- [x] `ApifyLinkedInAdapter` — LinkedIn job scraper via Apify REST API.
- [x] Platform `APIFY_API_TOKEN` environment variable (no per-user key required).
- [x] `JobNormalizationService` — normalizes title, company, location, remote, skills, salary, employment type.
- [x] `JobDeduplicationService` — SHA-256 fingerprint of `normalized(company|title|location)`.
- [x] `PrismaJobsRepository` — canonical job storage with upsert-by-fingerprint.
- [x] Multi-dimensional deterministic matching (skill, role, experience, location, seniority scores).
- [x] `ensureJobMatches()` — automatic matching on list, bounded batch, stale detection by `profileVersion`.
- [x] `computeAndPersistMatch()` — on-demand re-match with optional weight overrides.
- [x] Workspace job states: discovered, saved, dismissed, applied.
- [x] `saveJob`, `dismissJob`, `restoreJob`, `applyToJob` endpoints.
- [x] `recommendResumeProfile()` — picks best-matching Resume Profile for a job.
- [x] `createTargetedResumeVersion()` — creates a Resume Version targeting a specific job.
- [x] Job ingestion auto-derives search query from Master Career Profile headline if none provided.
- [x] REST: `GET /workspaces/:id/jobs`, `POST /workspaces/:id/jobs/ingest`, `POST /workspaces/:id/jobs/:jobId/apply`.
- [ ] Additional source adapters (Greenhouse, Lever, Ashby, Workday).
- [ ] User-managed saved searches and preference-based recommendation queue.

---

## Applications CRM

- [x] `Application` model: organizationId, jobId, status, notes, appliedAt, resumeProfileId, resumeVersionId.
- [x] Status lifecycle: `saved | applied | screening | interview | offer | rejected | withdrawn`.
- [x] `ApplicationStatusHistory` — all status transitions recorded with timestamp.
- [x] `ApplicationsService`: create, update, delete, list, findById, getStatusHistory.
- [x] REST: `GET/POST /workspaces/:id/applications`, `GET/PUT/DELETE /workspaces/:id/applications/:applicationId`, `GET .../history`.
- [ ] Calendar reminders for applications and follow-ups.
- [ ] Company workspace grouping by organization.

---

## AI Capability Layer

- [x] `AiCapabilityService.resolveCapability(workspaceId)` — BYOK → platform env → honest unavailable.
- [x] BYOK providers checked: `openai`, `anthropic`, `google`, `mistral`.
- [x] Platform providers checked: `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`.
- [x] `generateCompletion()` — executes Anthropic, OpenRouter, or OpenAI-compatible calls.
- [x] Never fabricates output when unavailable; returns structured `{ available: false, reason: '...' }`.
- [x] All AI env vars declared in `turbo.json` `globalEnv`.

---

## AI Coach

- [x] `POST /workspaces/:id/ai-coach/analyze` — role-level analysis grounded in Master Career Profile.
- [x] `POST /workspaces/:id/ai-coach/section` — section-level coaching (summary, experience, projects, skills, education).
- [x] `POST /workspaces/:id/ai-coach/apply-section` — writes accepted recommendation to Resume Profile only; Master Career Profile unchanged.
- [x] AI Coach LaTeX section update — regex-replaces `\resumesection{Title}` block in stored LaTeX source.
- [x] Capability-unavailable state returned with actionable message when no AI configured.

---

## Insights

- [x] `GET /workspaces/:id/insights/market` — AI Market Intelligence (requires ingested jobs + AI capability; honest unavailable otherwise).
- [x] `GET /workspaces/:id/insights/handbook` — Career Handbook (offline, 7 fields: SWE, Data Analytics, PM, Design, Research, Healthcare, Finance).
- [ ] Live market trend integration (real external market data sources).

---

## Deployment and Operations

- [x] Docker Compose baseline for web, API, and PostgreSQL.
- [ ] Redis integration (variable declared in `.env.example`; not yet wired in app code).
- [ ] Background job runner (Trigger.dev — `TRIGGER_SECRET_KEY` declared; not yet integrated).
- [ ] Object storage (R2 declared; not yet integrated).
- [ ] GitHub Actions CI (verify CI run status).
- [ ] Production deployment (staging environment, managed DB, DNS).

---

## Future / Deferred

- [ ] GitHub intelligence (repository analysis, contribution evidence).
- [ ] LinkedIn profile optimization.
- [ ] Portfolio / personal website analysis.
- [ ] Outreach Intelligence (ethical personalized drafts, never bulk).
- [ ] Relationship Intelligence (contact graph, alumni, referral tracking).
- [ ] Company Intelligence workspace.
- [ ] Career Analytics (application outcomes, resume performance, skill demand).
- [ ] Interview Intelligence (role- and company-specific preparation).
- [ ] Learning Intelligence (high-ROI skill recommendations from market evidence).
- [ ] Calendar scheduling integration.
- [ ] Billing and hosted AI subscription management.
- [ ] Advanced LaTeX PDF export pipeline.
