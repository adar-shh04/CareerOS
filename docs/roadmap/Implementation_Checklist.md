# CareerOS Implementation Checklist

**Purpose:** This is the authoritative delivery checklist. Update it in the same change that completes, defers, reprioritizes, or replaces a task.  
**Legend:** `[x]` complete · `[-]` in progress · `[ ]` not started · `[!]` blocked/needs explicit decision  
**Last updated:** 2026-09-08

---

## 0. Product governance

- [x] Establish CareerOS identity, mission, and golden rule.
- [x] Create living Product Memory.
- [x] Create project manifest and AI-agent operating protocol.
- [x] Record core product and architecture ADRs.
- [x] Create the public `adar-shh04/CareerOS` GitHub repository.
- [ ] Connect the local workspace to the remote repository (push pending).
- [ ] Create repository labels, milestones, and GitHub issue backlog.
- [ ] Add contribution, security, code-of-conduct documents.

---

## 1. Delivery platform and deployment

- [x] Create a Turborepo workspace with Next.js and NestJS packages.
- [x] Add formatting, linting, type checking, unit-test, and production-build commands (`pnpm lint`, `pnpm check-types`, `pnpm build`, `pnpm test`).
- [x] Add environment validation and example configuration without secrets (`.env.example`).
- [x] Add Docker Compose for web, API, and PostgreSQL.
- [x] Add Prisma migrations.
- [ ] Verify GitHub Actions CI run (workflow exists; run status unconfirmed).
- [ ] Select and provision production hosting (managed DB, cache, file storage, domain).
- [ ] Configure production secrets outside source control.
- [ ] Add health checks, structured logs, error tracking, backups, and rollback procedure.
- [ ] Deploy and verify a protected production baseline.

---

## 2. Foundation: identity, tenancy, and settings

- [x] Model users, organizations (workspaces), memberships, and sessions.
- [x] Email/password authentication via Better Auth v1.4.
- [x] Database-backed session management with `activeOrganizationId`.
- [x] `BetterAuthGuard` (global authentication) and `WorkspaceMemberGuard` (workspace authorization).
- [x] Multi-field onboarding: name, workspaceName, field, targetRole, careerDirection, skills, locationPreference, workArrangement.
- [x] Onboarding seeds Master Career Profile and initial Resume Profile — BYOK not required.
- [x] Encrypted BYOK credential storage (AES-256-GCM, `ByokCredential` table).
- [x] `ByokService`: store, retrieve-decrypted, delete, list providers.
- [ ] OAuth providers (Google, GitHub) — Better Auth supports them; not yet wired in the app.
- [ ] Privacy, export, deletion, and consent controls.

---

## 3. Foundation: career profile and resumes

- [x] Master Career Profile contract: identity, experience, education, skills, technologies, projects, achievements, certifications, publications, hackathons, links.
- [x] Prisma-backed PostgreSQL Master Career Profile repository with workspace isolation, UUIDs, optimistic versioning (`version` integer).
- [x] Client temporary ID normalization (e.g. `exp-1` → `randomUUID()`) — no validation errors on client IDs.
- [x] Career Profile CRUD API: `GET/POST /workspaces/:id/career-profile`.
- [x] Multiple named Resume Profiles per workspace.
- [x] Resume Profile section priority (prioritySkillIds, priorityProjectIds, priorityExperienceIds, priorityAchievementIds, priorityCertificationIds).
- [x] Canonical LaTeX source auto-generated at Resume Profile creation (`latex-template.util.ts`).
- [x] `POST /workspaces/:id/resume-profiles/import-latex` — import existing `.tex` into a Resume Profile.
- [x] `POST /workspaces/:id/resume-profiles/parse` — upload PDF/DOCX/TXT; heuristic + optional AI extraction.
- [x] Resume Version audit records (masterProfileSnapshot, selectedRecordIds, jobAnalysisEvidence, matchResult).
- [x] Applications reference `resumeProfileId` directly — no ResumeVersion required for applying.
- [ ] LaTeX PDF export — source stored; external compiler not yet integrated.
- [ ] Resume Studio full editor UI — frontend shell exists; editor not built.
- [ ] Cover letter templates and personalization.

---

## 4. Job Intelligence

- [x] Canonical `Job` model with normalization, deduplication, and workspace state.
- [x] `ApifyLinkedInAdapter` — LinkedIn job scraper via Apify REST API.
- [x] Platform `APIFY_API_TOKEN` environment variable support.
- [x] `JobNormalizationService` — title, company, location, remote, skills, salary, employment type.
- [x] `JobDeduplicationService` — SHA-256 fingerprint of normalized `company|title|location`.
- [x] Multi-dimensional deterministic job matching (skill, role, experience, location, seniority scores).
- [x] `ensureJobMatches()` — automatic matching on list with stale detection and bounded batch.
- [x] Workspace job states: discovered, saved, dismissed, applied.
- [x] `saveJob`, `dismissJob`, `restoreJob`, `applyToJob` REST endpoints.
- [x] Job Radar UI: listing, filtering, search, save/dismiss, job detail drawer.
- [x] `POST /workspaces/:id/jobs/ingest` — trigger Apify ingestion.
- [x] Auto-derive ingestion search query from Master Career Profile headline (multi-field; not hardcoded SWE).
- [ ] Additional source adapters (Greenhouse, Lever, Ashby, Workday).
- [ ] User-managed saved searches and recommendation queue UI.
- [ ] Configurable Opportunity Score weights exposed in UI.

---

## 5. Resume, skill, and Application Intelligence

- [x] `recommendResumeProfile()` — picks best-matching Resume Profile for a job using deterministic scoring.
- [x] `createTargetedResumeVersion()` — creates a Resume Version targeted at a specific job.
- [x] Applications CRM: lifecycle statuses, status history, notes, appliedAt, resumeProfileId.
- [x] `ApplicationsService`: create, update, delete, list, getStatusHistory.
- [x] `ApplicationStatusHistory` — all status transitions recorded with timestamp.
- [ ] ATS keyword coverage analysis (without keyword stuffing).
- [ ] Skill gap calculation and display.
- [ ] Resume outcome tracking (response rates, interview rates by resume version).

---

## 6. AI Capability Layer

- [x] `AiCapabilityService.resolveCapability()` — workspace BYOK → platform env → honest unavailable.
- [x] BYOK provider detection: openai, anthropic, google, mistral.
- [x] Platform provider detection: OPENROUTER_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY.
- [x] `generateCompletion()` — direct HTTP to Anthropic, OpenRouter, and OpenAI-compatible endpoints.
- [x] Honest `{ available: false, reason: '...' }` returned when no provider configured.
- [x] All AI env vars declared in `turbo.json globalEnv`.

---

## 7. AI Coach

- [x] `POST /workspaces/:id/ai-coach/analyze` — role-level analysis grounded in Master Career Profile.
- [x] `POST /workspaces/:id/ai-coach/section` — section-level coaching (summary, experience, projects, skills, education).
- [x] `POST /workspaces/:id/ai-coach/apply-section` — writes accepted recommendation to Resume Profile only.
- [x] AI Coach LaTeX section update via regex (`\resumesection{Title}` replacement).
- [x] Master Career Profile is never modified by AI Coach.
- [x] Capability-unavailable state returned with actionable message when no AI configured.

---

## 8. Insights

- [x] `GET /workspaces/:id/insights/market` — AI Market Intelligence (requires ingested jobs + AI).
- [x] `GET /workspaces/:id/insights/handbook` — Career Handbook (offline, 7 career fields).
- [ ] Live external market trend data integration.
- [ ] Skill demand trend charts in UI.

---

## 9. Company, Outreach, and Relationship Intelligence

- [ ] Company workspace: roles, applications, notes, tech stack, interview knowledge.
- [ ] Relationship graph: contacts, affiliations, interactions, referrals, alumni.
- [ ] User-owned contact directory.
- [ ] Ethical outreach drafts (individual, reviewable — never bulk).
- [ ] Outreach timeline, reminders, response tracking.
- [ ] Optional Gmail / Outlook integration.

---

## 10. Career Memory, Analytics, and Future Modules

- [ ] User-editable Career Memory with source, confidence, and deletion controls.
- [ ] Application, response, interview, resume, outreach, and skill-demand analytics.
- [ ] Learning recommendations with market evidence and uncertainty disclosure.
- [ ] Role- and company-specific interview preparation.
- [ ] GitHub intelligence, LinkedIn profile optimization, LeetCode, learning-platform integrations.
- [ ] Calendar support for interviews, applications, and learning sessions.

---

## 11. Quality, security, and release readiness

- [x] Unit tests for Career Profile, Resume Profile, AI Capability, AI Coach, Insights services.
- [x] All tests passing (19 spec + 116 total via `pnpm test`).
- [x] Type checking: `pnpm check-types` passes across all packages.
- [x] Lint: `pnpm lint` passes with 0 errors.
- [x] Build: `pnpm build` succeeds for all packages.
- [ ] End-to-end and integration tests.
- [ ] Tenant boundary and authorization failure tests.
- [ ] Accessibility and responsive layout checks.
- [ ] Security threat model for credentials, PII, and tenant boundaries.
- [ ] Backup, retention, restore, and data deletion procedures.
- [ ] Security policy, privacy documentation, and self-hosting guide.
- [ ] Closed beta, consented feedback collection.
- [ ] First stable open-source release tag.
