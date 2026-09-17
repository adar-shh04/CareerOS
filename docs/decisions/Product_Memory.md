# CareerOS Product Memory

**Version:** 1.2  
**Last updated:** 2026-09-08  
**Status:** Living document

## Identity and mission

- **Name:** CareerOS
- **Tagline:** Your Career Operating System.
- **Identity:** A multi-tenant, self-hostable Career Operating System, not a job board.
- **Mission:** Automate repetitive job-search work so people can invest their judgment in applying, networking, interviewing, and deciding.
- **Goal:** More interviews from fewer, better-targeted applications.
- **Golden rule:** A feature must reduce repetitive work while increasing interview probability, decision quality, organization, or networking effectiveness.

## Product and platform commitments

- Build for many users; Adarsh is the first power user and must never be hardcoded into product behavior.
- Be open source, self-hostable, cloud deployable, API-first, modular, event-driven, containerized, scalable, and production-oriented.
- Use multi-tenant architecture: users own their data and data boundaries must be enforced at the API and database layer.
- Use Better Auth v1.4 for session and organization management with database-backed session validation.
- Use a Bring Your Own Keys model for AI and external integrations. BYOK is **never mandatory** — platform-level AI configuration is supported, and core functionality must work without any AI.
- Treat third-party services as optional plugins. Users enable only the services they want.

## User-control and privacy commitments

- Never auto-apply. Automation ends before the external application submission.
- Never send mass outreach. Messages and emails are personalized drafts requiring user review and action.
- Use only user-provided data, public information, or authorized integrations; never harvest or expose private contact details.
- Respect source terms, privacy law, consent, and data minimization.
- Every AI recommendation must provide a human-readable rationale grounded in verified evidence and allow user override.

## Core product decisions

- **Master Career Profile:** The source of verified career truth per workspace. Contains the user's full career evidence. Never modified by AI features.
- **Resume Profiles:** Multiple named persistent resume configurations per workspace (e.g. "SDE Resume", "Data Analyst Resume"). AI Coach can suggest changes to Resume Profiles; these changes never propagate back to the Master Career Profile.
- **LaTeX-first resumes:** Each Resume Profile carries a canonical LaTeX source auto-generated at creation. Section updates (AI Coach apply) modify the stored LaTeX source. External PDF compilation is not yet integrated.
- **Applications reference resumeProfileId:** Applications record which Resume Profile was used. A ResumeVersion snapshot is not required to apply to a job.
- **ResumeVersion:** Exists as an audit/history record attached to a ResumeProfile. Not a required workflow step for applying.
- **Zero fabricated intelligence:** AI features return honest capability-unavailable messages rather than fake statistics, fake market numbers, or placeholder advice.
- **AI Capability Resolution:** Workspace BYOK credentials checked first, then platform-level env vars, then honest unavailable state. No AI key required to use CareerOS core features.
- **Multi-field support:** CareerOS does not assume Software Engineering. Onboarding, Job Radar ingestion, Career Handbook, and AI Coach support all career fields (SWE, Data Analysis, PM, Design, Research, Healthcare, Finance, and others).
- **Job Intelligence:** Ingest, normalize, deduplicate, score, rank, and recommend jobs. SHA-256 fingerprint deduplication on normalized `company|title|location`. Matching is deterministic and multi-dimensional (skill, role, experience, location, seniority).
- **Platform job token:** `APIFY_API_TOKEN` can be set at the platform level so users do not need personal Apify accounts for basic job discovery.
- **Career Handbook:** Permanently offline educational reference across career fields. Not AI-generated, not live market data.
- **AI Market Intelligence:** Analyzes real ingested job data with AI synthesis. Never fabricates market statistics. Honestly unavailable without ingested jobs or AI capability.
- **Workspace Job State:** Users can save, dismiss, restore, and annotate jobs per workspace without mutating canonical job data.
- **Client ID normalization:** Temporary client IDs (e.g. `exp-1`, `skill-123`) submitted by frontend are sanitized to `randomUUID()` before database persistence — no validation errors thrown on client-generated IDs.
- **Application CRM:** Every application is a durable object with job, status, status history, notes, appliedAt, resumeProfileId, and optional resumeVersionId.
- **Cover letters:** Planned. Not yet implemented.
- **Outreach Intelligence:** Planned. Recommend ethical individual actions; never bulk campaigns.
- **Relationship Intelligence:** Planned. User-owned relationship graph.

## Design commitments

- The product should be professional, minimal, and fast, with the utility and restraint of Linear, Notion, or GitHub.
- Avoid decorative motion and dashboard clutter.
- Explanations are a first-class UI element, not a hidden model artifact.
- AI features must surface their evidence sources and confidence level.

## Deferred opportunities

- GitHub intelligence, LinkedIn profile optimization, portfolio analysis, LeetCode tracking, learning-platform imports, calendar scheduling, richer company intelligence, interview preparation, advanced market trend data, billing and hosted AI subscriptions.
