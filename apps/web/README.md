# CareerOS Web Application

The frontend client for CareerOS, built with Next.js 16 (React 19), TypeScript, and Tailwind CSS v4. It delivers a fast, responsive, and distraction-free user interface designed around clarity, agency, and verified career data.

---

## Features

- **Job Radar (`/jobs`, `/jobs/[id]`, `/jobs/saved`)**: Real-time search, filters (remote, role, salary, skills), deterministic match score explanations, and one-click save/dismiss workflows.
- **Master Career Profile (`/career`)**: Canonical, single-source-of-truth profile editor for experiences, education, skills, technologies, projects, achievements, certifications, publications, and links.
- **Resume Profiles (`/resumes`, `/resumes/[id]`)**: Direction-specific persistent resume configurations (e.g. "Staff Fullstack", "AI Engineer") with automated LaTeX generation and version snapshots.
- **Applications CRM (`/applications`, `/applications/[id]`)**: End-to-end application lifecycle tracking (saved → applied → screening → interview → offer → decision) with stage notes and status history.
- **AI Coach (`/coach`)**: Role analysis, section-level recommendations grounded in Master Profile evidence, and one-click application to Resume Profiles (never mutates Master Profile).
- **Career Handbook (`/insights`)**: Permanently offline field guide covering career ladders, core skills, and expectations across 7 industries.
- **Authentication & Onboarding (`/login`, `/register`, `/onboarding`)**: Better Auth client integration with multi-tenant organization creation and multi-field onboarding.

---

## Architecture & Conventions

```text
apps/web/
├── app/                  # Next.js App Router (pages and API route proxies)
│   ├── (auth)/           # Authentication routes (/login, /register, /onboarding)
│   ├── api/              # Route handlers bridging to the NestJS API
│   ├── applications/     # Application CRM views
│   ├── career/           # Master Career Profile editor
│   ├── coach/            # AI Coach interface
│   ├── dashboard/        # Career command center
│   ├── insights/         # Career Handbook and Market Insights
│   ├── jobs/             # Job Radar views
│   └── resumes/          # Resume Profile manager and studio
├── components/           # Feature-sliced UI components
├── lib/                  # Auth client, API client, and utilities
└── providers/            # Client context providers (Auth, Query)
```

- **Styling**: Tailwind CSS v4 using CSS variables and `--careeros-*` design tokens defined in `app/globals.css`.
- **Contracts**: Strongly typed using shared models from `@repo/types`.
- **Auth**: Client authentication via `better-auth/react`, respecting `activeOrganizationId`.

---

## Development

```bash
# Run standalone dev server (from monorepo root)
pnpm --filter web dev

# Or run via Turborepo root
pnpm dev
```

The application runs at `http://localhost:3000`.

### Quality Commands

```bash
pnpm --filter web check-types   # Type check with next typegen + tsc
pnpm --filter web lint          # ESLint with zero-warning threshold
pnpm --filter web build         # Production Next.js build
```
