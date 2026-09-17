# Contributing to CareerOS

Thank you for your interest in contributing to CareerOS! CareerOS is an open-source, multi-tenant Career Operating System built to give candidates structured control over their career data, applications, and job discovery.

---

## Prerequisites

Before contributing, ensure you have the following installed locally:

- **Node.js**: `v18.0.0` or higher (Node 20+ recommended)
- **pnpm**: `v9.0.0` or higher (`corepack enable && corepack use pnpm@9.0.0`)
- **Docker & Docker Compose**: Required for running the local PostgreSQL database

---

## Repository Structure

CareerOS is organized as a Turborepo monorepo:

```text
apps/
  web/                  # Next.js 16 (React 19) frontend application
  api/                  # NestJS backend API & Prisma database services
packages/
  types/                # Shared TypeScript contracts and domain models (@repo/types)
  utils/                # Shared helper functions and calculations (@repo/utils)
  eslint-config/        # Shared ESLint configuration (@repo/eslint-config)
  typescript-config/    # Shared tsconfig bases (@repo/typescript-config)
tooling/
  scripts/              # Maintenance and migration verification scripts
docs/                   # Architecture documentation, ADRs, and product memory
```

---

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/adar-shh04/CareerOS.git
   cd CareerOS
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   cp apps/api/.env.example apps/api/.env
   ```

4. **Start local database services:**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

5. **Generate Prisma client and apply migrations:**
   ```bash
   pnpm --filter careeros-api db:generate
   pnpm --filter careeros-api db:migrate:dev
   ```

6. **(Optional) Seed development database:**
   ```bash
   SEED_USER_PASSWORD="YourLocalDevPassword" pnpm --filter careeros-api db:seed
   ```

7. **Start the development servers:**
   ```bash
   pnpm dev
   ```
   - Web frontend: `http://localhost:3000`
   - Core API: `http://localhost:3001`

---

## Quality Gates

Before opening a pull request, verify that all quality checks pass locally:

```bash
# 1. Type check all packages
pnpm run check-types

# 2. Lint all packages with zero warnings
pnpm run lint

# 3. Run backend unit and service test suites
pnpm --filter careeros-api exec jest --runInBand

# 4. Verify production build
pnpm run build
```

---

## Pull Request Guidelines

- **Focused Scope**: Keep PRs focused on a single feature, bug fix, or improvement.
- **Architectural Respect**:
  - All database queries must be scoped to an `organizationId`.
  - The Master Career Profile is the single source of verified truth; AI features must never overwrite it.
  - Core platform functionality (job search, deterministic matching, application tracking) must never depend on an AI provider being configured.
- **No Secrets**: Never commit API keys, personal credentials, or local environment files (`.env`).
- **Tests**: Include unit or integration tests for new business logic or bug fixes.
