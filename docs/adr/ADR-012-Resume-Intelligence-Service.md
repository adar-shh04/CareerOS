# ADR-012: Dedicated Resume Intelligence Microservice Integration

- **Status:** Proposed
- **Date:** 2026-07-31

## Context

Resume parsing, ATS scoring, skill-gap analysis, section-wise rewording, and resume compilation require complex document processing, NLP analysis, and template generation. Mature open-source implementations (e.g. `opportune-jobMate` and `interviewstreet/hiring-agent`) exist in Python. Rewriting these complex NLP parsing libraries into TypeScript under deadline pressure introduces high technical risk and delay. However, embedding arbitrary Python code into core monorepo packages would break modular monorepo isolation commitments.

## Decision

Propose introducing a narrow, dedicated Python FastAPI service ("Resume Intelligence Service") to house extracted resume intelligence algorithms.

### Service Constraints
1. **Narrow Contract:** The service is strictly scoped to exactly five endpoints under `/v1/resume/*`:
   - `POST /v1/resume/analyze` — Document parsing (PDF/DOCX) to structured resume JSON.
   - `POST /v1/resume/ats-score` — Rule-based & LLM-assisted ATS compatibility scoring.
   - `POST /v1/resume/skill-gap` — Skill gap analysis against job descriptions.
   - `POST /v1/resume/suggest` — Section-wise improvement and rewording suggestions.
   - `POST /v1/resume/build` — Form/data to formatted resume export (HTML/DOCX/PDF).
2. **No General AI Gateway:** The service MUST NOT become a catch-all gateway for generic LLM calls outside resume processing scope.
3. **BYOK Credentials:** External AI provider keys are passed per-request from NestJS using user-configured BYOK encrypted storage. No permanent API keys or tenant state are stored inside the microservice.
4. **NestJS Gateway Proxy:** A dedicated `resume-intelligence` NestJS module in `apps/api` proxies web requests to this microservice while enforcing JWT authentication and workspace tenant guards.

## Alternatives Considered

- **Porting logic to Node.js/TypeScript:** Rejected due to lack of mature, native TypeScript parity for document layout processing and rule-based ATS evaluation logic, creating high maintenance overhead.
- **Monolithic Python Gateway for all AI tasks:** Rejected because it violates modularity and risks turning the microservice into an unmaintainable catch-all service.

## Consequences

- Requires container orchestration (Docker/Compose) support for running the Python service alongside PostgreSQL, Redis, NestJS, and Next.js.
- Clean separation between core TypeScript web/API infrastructure and isolated Python document processing logic.
