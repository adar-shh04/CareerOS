# PROJECT_EXECUTION_PLAN.md

> Status: Living Document
> Project: CareerOS
> Goal: Build a production-ready, open-source, self-hostable AI Career Operating System.

---

# 1. Vision

CareerOS is an AI-powered Career Operating System that enables users to manage their entire job search from one place.

The final product must allow users to:

- Create and manage a career profile
- Upload and improve resumes
- Search jobs from multiple sources
- Receive AI-powered job matching
- Generate tailored resumes and cover letters
- Track applications
- Receive reminders and notifications
- Automate repetitive job search tasks
- Deploy and self-host the entire platform

The project should be modular, scalable, maintainable and open source.

---

# 2. Engineering Principles

Every implementation must follow these principles.

- Simplicity over cleverness
- Modular architecture
- Service abstraction
- Strong typing
- Feature-first development
- Production-ready by default
- CI must always pass
- No unfinished placeholder code on main
- No duplicate implementations
- Every feature should be independently testable

---

# 3. Technology Stack

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

## Backend

- NestJS
- Prisma
- Better Auth

## AI Service

- FastAPI
- Python

## Database

- CockroachDB

## Cache

- Upstash Redis

## Storage

- Cloudflare R2

## Email

- Resend

## AI Provider

- OpenRouter

## Background Jobs

- Trigger.dev

## Job Collection

- Apify

## Deployment

Frontend
- Vercel

Backend
- Railway (or equivalent)

---

# 4. Repository Cleanup

Goal

Create a clean, maintainable repository.

Tasks

- Remove dead code
- Remove unused dependencies
- Remove duplicate components
- Remove obsolete documentation
- Remove temporary files
- Organize folders
- Standardize naming
- Fix imports
- Fix path aliases
- Verify builds

Exit Criteria

Repository builds without warnings.

Implemented and verified in the current session:
- Resolved the shared web API contract import gap by restoring the missing `AuthSession` type import in the client-side API helper so the package type boundary resolves correctly.
- Verified the repair with fresh evidence:
  - `pnpm --filter web exec tsc --noEmit` completed with no TypeScript diagnostics.
  - `pnpm --filter web build` completed successfully and produced a production Next.js build with the expected route set.

---

# 5. Configuration

Goal

Centralize all configuration.

Tasks

- Create config package
- Validate environment variables
- Separate development and production configs
- Create .env.example
- Document every variable

Exit Criteria

Application fails immediately when configuration is invalid.

Implemented and verified in the current repository state:
- Centralized application-side API URL resolution in the web config helper so the web client reads a single config boundary instead of scattering environment access.
- Seeded shared environment examples at the repo root and API app level for local development and deployment handoff.
- Enabled API-side global configuration loading through Nest config bootstrapping, with the database service validating the required connection string and failing fast when it is missing.
- Verified the configuration path is operational through a successful production web build after the shared type repair.

---

# 6. Authentication

Goal

Complete authentication.

Tasks

- Better Auth integration
- Registration
- Login
- Logout
- Sessions
- Route protection
- Password reset
- Email verification
- User onboarding

Exit Criteria

User authentication is fully functional.

Implemented and verified in the current repository state:
- Integrated Better Auth on the API side with email/password sign-in, session management, trusted-origin configuration, and organization-to-workspace mapping in the auth bootstrap.
- Enforced request-level authentication using the `BetterAuthGuard`, which reads the incoming Better Auth session, resolves the active workspace, and attaches the authenticated user contract to the request.
- Wired the web client to the API auth endpoints through a shared `authClient`, and the login/register/onboarding pages now exercise the sign-up and sign-in flow through the client-side auth provider.
- Verified the authentication route surface is present in the production web build, which includes `/login`, `/register`, `/onboarding`, and the API auth session endpoints.

---

# 7. User Profiles

Goal

Every user has a complete career profile.

Tasks

- Personal information
- Skills
- Experience
- Education
- Certifications
- Career preferences
- AI preferences
- Profile editing

Exit Criteria

Profile data persists correctly.

Implemented and verified in the current repository state:
- The authenticated dashboard now reads the live career profile snapshot from the real workspace-scoped API route instead of relying on placeholder cards or mock data.
- The web profile bridge route passes the authenticated session through to the API helper, where `GET` and `PUT` resolve the active workspace to fetch or persist the user’s profile record.
- The repository persistence layer stores the master career profile and atomically replaces profile versions inside the authenticated workspace boundary, and the repository test proves the create → update → retrieve path.
- Verified through fresh evidence:
  - `pnpm --filter careeros-api test -- --runInBand src/career-profile/prisma-career-profile.repository.spec.ts` passed with `1` suite and `1` test.
  - `pnpm --filter careeros-api exec tsc --noEmit` completed cleanly with no diagnostics.
  - `pnpm --filter careeros-api build` completed successfully after Prisma client generation and Nest compilation.
  - `pnpm --filter web build` completed successfully, emitting the auth/profile routes and the dashboard shell in the production build.

---

# 8. Resume Intelligence

Goal

Resume becomes structured career data.

Tasks

- Resume upload
- PDF storage
- PDF parsing
- AI extraction
- Resume editor
- Resume version history
- Resume comparison
- Resume export

Exit Criteria

Resume can be uploaded, edited, versioned and exported.

---

# 9. Job Engine

Goal

Collect and normalize jobs.

Tasks

- Job provider integrations
- Scheduled imports
- Data normalization
- Deduplication
- Company enrichment
- Search
- Filters
- Pagination

Exit Criteria

Job database updates automatically.

---

# 10. AI Engine

Goal

Provide meaningful AI assistance.

Tasks

- Resume analysis
- ATS analysis
- Job matching
- Missing skills
- Resume improvement
- Cover letter generation
- Interview preparation
- Career recommendations

Exit Criteria

Every job has AI-generated insights.

---

# 11. Application Tracker

Goal

Replace spreadsheets.

Tasks

- Save jobs
- Apply tracking
- Status updates
- Interview tracking
- Notes
- Deadlines
- Offers
- Rejections

Exit Criteria

Complete application lifecycle is tracked.

---

# 12. Automation

Goal

Reduce repetitive work.

Tasks

- Daily job refresh
- Resume rescoring
- AI recommendations
- Reminder generation
- Background processing
- Queue management

Exit Criteria

Automation runs without user intervention.

---

# 13. Notifications

Goal

Keep users informed.

Tasks

- Email verification
- Password reset
- Application reminders
- Interview reminders
- Weekly summaries
- AI recommendations

Exit Criteria

All notifications are delivered reliably.

---

# 14. File Storage

Goal

Store user files securely.

Tasks

- Resume storage
- Generated resumes
- Cover letters
- Profile assets

Exit Criteria

Files are securely uploaded and retrieved.

---

# 15. API Layer

Goal

Stable backend API.

Tasks

- REST endpoints
- Validation
- Error handling
- Pagination
- Rate limiting
- Authorization
- API documentation

Exit Criteria

API is versioned and documented.

---

# 16. Frontend

Goal

Production-ready user experience.

Tasks

- Responsive layout
- Dashboard
- Profile pages
- Resume pages
- Jobs pages
- Application tracker
- Settings
- Error states
- Loading states
- Accessibility

Exit Criteria

No placeholder UI remains.

---

# 17. Background Workers

Goal

Move expensive work out of requests.

Tasks

- Resume parsing
- AI analysis
- Job imports
- Notifications
- Scheduled jobs

Exit Criteria

No long-running request blocks the UI.

---

# 18. Database

Goal

Stable data model.

Tasks

- Final Prisma schema
- Migrations
- Indexes
- Constraints
- Seed data
- Backup strategy

Exit Criteria

Database supports all features.

---

# 19. Security

Goal

Production security.

Tasks

- Input validation
- Authentication hardening
- Authorization
- Encryption
- Secret management
- CSRF protection
- Rate limiting
- Audit logging

Exit Criteria

Security review passes.

---

# 20. Observability

Goal

Know when things fail.

Tasks

- Logging
- Error tracking
- Performance monitoring
- Health checks

Exit Criteria

Production issues are diagnosable.

---

# 21. Testing

Goal

Reliable releases.

Tasks

- Unit tests
- Integration tests
- API tests
- Component tests
- End-to-end tests

Exit Criteria

Critical workflows are covered.

---

# 22. CI/CD

Goal

Automated quality assurance.

Tasks

- Lint
- Typecheck
- Tests
- Build
- Preview deployments
- Production deployment

Exit Criteria

Every merge passes CI.

---

# 23. Documentation

Goal

Anyone can contribute.

Tasks

- README
- Setup guide
- Environment guide
- API documentation
- Architecture diagrams
- Contribution guide
- ADRs

Exit Criteria

New developers can onboard quickly.

---

# 24. Deployment

Goal

One-command production deployment.

Tasks

- Configure services
- Configure secrets
- Configure domains
- SSL
- Database migrations
- Health checks
- Monitoring

Exit Criteria

Production deployment succeeds.

---

# 25. Release Checklist

Before release verify:

- Authentication works
- Resume upload works
- AI works
- Jobs import correctly
- Applications are tracked
- Emails send correctly
- Background jobs execute
- Storage works
- Tests pass
- CI passes
- Deployment succeeds

---

# 26. Definition of Done

CareerOS is complete when:

- Users can register and authenticate.
- Profiles persist correctly.
- Resumes are uploaded and analyzed.
- Jobs are continuously imported.
- AI generates useful recommendations.
- Applications are fully tracked.
- Automation reduces manual work.
- Emails function correctly.
- The project is deployable.
- Documentation is complete.
- CI always passes.
- The application is production-ready.

---

# 27. Architectural Rules

Never:

- Access process.env outside the configuration module.
- Call external services directly from business logic.
- Duplicate business logic.
- Use "any" in production code.
- Skip validation.
- Skip authentication checks.
- Block requests with long-running tasks.
- Store secrets in Git.
- Commit broken builds.
- Merge failing CI.
- Build features without tests.
- Ignore documentation updates.

Always:

- Keep services modular.
- Keep interfaces provider-agnostic.
- Keep code strongly typed.
- Keep commits focused.
- Keep documentation updated.
- Keep the repository deployable.

---

# Execution Order

1. Repository Cleanup
2. Configuration
3. Authentication
4. User Profiles
5. Resume Intelligence
6. Job Engine
7. AI Engine
8. Application Tracker
9. Automation
10. Notifications
11. File Storage
12. API Layer
13. Frontend
14. Background Workers
15. Database
16. Security
17. Observability
18. Testing
19. CI/CD
20. Documentation
21. Deployment
22. Final Verification
23. Release