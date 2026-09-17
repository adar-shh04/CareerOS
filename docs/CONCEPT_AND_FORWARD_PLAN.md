# CareerOS Concept Inputs and Forward Plan

**Purpose:** Main-agent execution brief. This document records planning only; it does not authorize product behavior that violates the CareerOS Product Memory or accepted ADRs.

**Source materials reviewed:**

- `Software Engineer B Tech JD.docx`
- `Data Engineer JD.docx`
- `Adarsh Resume.pdf`
- `Adarsh_Singh_CoverLetter.pdf`

## Concept Signals from the Job Descriptions

### Software Engineering target

The Software Engineer role emphasizes the complete software lifecycle: requirements analysis, technical design, coding, unit testing, integration, CI/CD delivery, documentation, production issue resolution, and collaboration across global teams. It values foundational programming in Java, C#/.NET, C++, or Python; frameworks, databases, distributed systems, Linux/Unix, Agile practices, JIRA, problem-solving, communication, and maintainability. It also exposes candidates to full-stack, SRE, AI/ML, cloud, security, and mobile work.

### Data Engineering target

The Data Engineer role emphasizes reliable data delivery: ingesting, cleaning, transforming, controlling, and validating data; building data structures, metadata, pipelines, lineage, quality controls, dependency management, and workloads; testing and operational availability. The listed technology exposure includes Hadoop/HDFS, Spark, Hive, Python, SQL, Scala, streaming, Kafka, ETL, Tableau, and related data-platform tools.

### Product Implication

CareerOS must represent one master profile while producing different role-specific projections. The two job descriptions are a clear acceptance concept for:

- A **Software Engineering** resume profile prioritizing software lifecycle, programming, testing, CI/CD, systems, and collaboration evidence.
- A **Data Engineering** resume profile prioritizing data pipelines, transformations, SQL/Python, quality, lineage, testing, and reliability evidence.
- A transparent comparison that shows matched evidence, gaps, suggested ordering, and items the user should verify or improve.

The supplied resume and cover letter are private source artifacts. Treat them as import fixtures only after explicit user confirmation. Do not hardcode their content, store unreviewed parsed claims, or reuse personal contact data in test fixtures.

## Developments Completed So Far

### Product and architecture

- Created CareerOS product documentation, Product Memory, PRDs, ADRs, implementation checklist, feature delivery inventory, and AI-agent context protocol.
- Accepted a TypeScript-first Turborepo foundation: Next.js, NestJS, PostgreSQL with pgvector, Redis, OpenAPI, Docker Compose, and GitHub Actions.
- Documented multi-tenancy, BYOK, explainability, user review, no auto-apply, no bulk outreach, and provenance requirements as product constraints.

### Repository and UI

- Created and connected the GitHub repository `adar-shh04/CareerOS`.
- Added Turborepo apps for web, docs, and API, plus Docker Compose and an initial CI workflow.
- Implemented a static dashboard shell at `/dashboard` that represents job intelligence, resume studio, application focus, and review-required outreach.

### Resume Intelligence foundation

- Added a canonical `MasterCareerProfile` contract for identity, education, experience, projects, achievements, skills, technologies, publications, hackathons, certifications, links, and record source metadata.
- Added a tenant-scoped profile service that normalizes empty collections, versions changes, prevents caller mutation, and isolates profiles by workspace.
- Added focused profile-service tests and a planned REST controller/module.
- Local validation passed: dependency install with ignored scripts, focused tests, lint, type-check, and build.

### Known integration state

- `CareerProfileModule` still needs to be registered in `apps/api/src/app.module.ts` before its controller is reachable.
- The current profile store is in-memory and must be replaced with tenant-isolated PostgreSQL persistence before user data is considered durable.
- GitHub Actions currently fails before project validation during pnpm setup. It is an infrastructure task, not a Resume Intelligence blocker; retain local validation for feature work.

## Recommended Build Strategy

Build CareerOS through a sequence of small, user-visible vertical slices that all read from the same Master Career Profile. Do not build independent resume, outreach, or application data silos.

```text
Master Career Profile
        |
        +--> Resume Profiles --> Immutable Resume Versions --> HTML / LaTeX / PDF
        |
        +--> Job Analysis --> Explainable Match Evidence --> Opportunity Actions
        |
        +--> Company / Contact Context --> Reviewable Outreach Drafts
        |
        +--> Applications --> Outcomes --> Analytics and Career Memory
```

## Prominent Next Step: Durable Profile and Resume Profile Slice

Complete the first end-to-end Resume Intelligence slice before introducing AI providers or email integrations.

### Scope

1. Register `CareerProfileModule` in the Nest application.
2. Add PostgreSQL persistence, migrations, and tenant/workspace ownership checks for Master Career Profiles.
3. Add authenticated API boundaries; never trust a caller-provided workspace ID without authorization.
4. Implement Resume Profiles as presentation rules over master data, not duplicated content.
5. Implement immutable Resume Versions with an input snapshot and selected-content metadata.
6. Add a minimal web screen that creates/edits the profile, creates a named profile, and displays a version history.

### Resume Profile Model

A Resume Profile should contain only targeting and presentation rules:

- Name and role focus, such as `Software Engineering` or `Data Engineering`.
- Visible sections and section order.
- Preferred wording and summary guidance.
- Highlight rules.
- Priority project, skill, experience, achievement, and certification IDs.
- Template choice and optional style settings.

It must reference Master Career Profile records by ID. It must not copy facts into a second profile-specific data store.

### Resume Version Model

Each export must create a new immutable version containing:

- Workspace, resume profile, target company, target role, and creation time.
- Master-profile snapshot and selected record IDs.
- Template version and output format (`html`, `latex`, `pdf`).
- Job-analysis evidence, ATS/match result, confidence, and explanation when available.
- Artifact metadata and application association once an application exists.

Never overwrite a generated version after a profile edit.

### Acceptance Checks

- Editing the master profile does not alter an existing resume version.
- A Software Engineering profile and Data Engineering profile can use the same underlying project while changing priority and ordering.
- A user can see why a record was selected for a target role.
- All read/write paths enforce workspace ownership.
- No external AI provider, email provider, or document compiler is required for this first slice.

## Phased Forward Plan

### Phase A - Authenticated Profile Access and Resume Profiles

- Keep the completed Prisma/PostgreSQL Master Career Profile repository behind an authenticated, tenant-derived workspace boundary.
- Add API and service tests for tenant isolation, immutable snapshots, profile selection, and validation.
- Add OpenAPI documentation for the new endpoints.

### Phase B - Resume Studio and HTML Export

- Build reusable section components and a live HTML preview.
- Support ordering and visibility controls; add structured editing for bullets rather than raw PDF editing.
- Export a deterministic HTML artifact and JSON snapshot.
- Add individual accept/reject workflow for suggested edits, rewrites, STAR/XYZ conversions, impact highlighting, keyword recommendations, and grammar improvements.

### Phase C - Local LaTeX and PDF Pipeline

- Define a template adapter contract and support multiple LaTeX templates.
- Render structured resume version data into a template.
- Compile locally or in a container; store immutable artifact metadata.
- Keep Overleaf optional through a user-managed Git-compatible workflow. Do not depend on undocumented Overleaf APIs.
- Verify generated PDFs visually and keep compilation isolated from the web request path.

### Phase D - Job Description Analysis and Explainability

- Normalize an imported or plugin-supplied job description.
- Extract required/preferred skills, technologies, responsibilities, domain, seniority, education, and keywords.
- Compare the job against the selected Master Career Profile and Resume Profile.
- Return matched evidence, missing skills, recommended projects/achievements/order, alternative profile, confidence, and a human-readable explanation.
- Start with deterministic matching; add BYOK AI only as an explainable enhancement.

### Phase E - Ethical Cold Email and Networking Intelligence

- Add provenance-aware companies and contacts; store source, confidence, last interaction, relationship strength, referral potential, and notes.
- Implement a transparent contact-priority score using hiring relevance, team relevance, shared technologies, referral likelihood, recent activity, and company priority.
- Add draft generators for recruiter outreach, hiring-manager outreach, referral requests, follow-ups, interview thank-yous, and networking messages.
- Require the user to choose a job, resume version, and contact before generation.
- Support only reviewable drafts; no automatic messages, bulk generation, contact harvesting, or automatic sending.

### Phase F - Job Intelligence and Application CRM

- Add external adapters for Greenhouse, Lever, Ashby, Workday, and user-authorized Apify sources.
- Normalize and deduplicate canonical jobs.
- Calculate an explainable Opportunity Score from resume fit, skills, location, competition, hiring velocity, referral availability, company preference, and salary where available.
- Add application objects, company workspaces, follow-ups, documents, outcomes, and analytics links.

### Phase G - Infrastructure and Deployment

- Fix GitHub CI as a focused infrastructure change after identifying the pnpm setup failure from authenticated logs.
- Add staging before production; configure secrets, backups, observability, migrations, managed PostgreSQL, Redis, storage, and domain controls.
- Do not deploy user data handling publicly until authentication, authorization, encryption, and persistence are validated.

## Main-Agent Working Rules

- Read `PROJECT_MANIFEST.md`, `AI_CONTEXT.md`, Product Memory, ADRs, relevant PRDs, and roadmap before coding.
- Keep the shared profile as the only career-data source of truth.
- Make AI explainability and user acceptance/rejection part of every recommendation workflow.
- Never implement auto-apply, auto-send, mass outreach, private-contact scraping, or hidden scoring.
- Treat CI as a parallel infrastructure task; do not pause feature development solely because its pnpm setup currently fails.
- Update `Feature_Delivery_Status.md`, `Implementation_Checklist.md`, and this plan after material milestones.
- Prefer small, tested changes. Use local validation: `pnpm install --frozen-lockfile --ignore-scripts`, focused tests, `pnpm run lint`, `pnpm run check-types`, and `pnpm run build`.
