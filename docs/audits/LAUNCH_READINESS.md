# CareerOS — Launch Readiness & Deployment Assessment

**Audit Date:** November 2026  
**Audited Baseline Commit:** `137fa91` (`stabalization pass 5 final audit`)  
**Scope:** Evaluation of public demonstration readiness, personal job search usability, and public alpha launch blockers.

---

## 1. Readiness Matrix Across Four Tiers

| Tier | Evaluation Target | Status | Critical Blocker Summary |
|---|---|---|---|
| **Tier 1** | **LinkedIn Announcement & Video Walkthrough** | **NOT READY (75% there)** | No ability to paste a real JD live on screen. Clicking "Targeted Resume" in the drawer has no visual redirect or success link. |
| **Tier 2** | **Personal Job-Search Usability (Daily Driver)** | **BLOCKED (65% there)** | Cannot add arbitrary job descriptions encountered during actual job hunt. No follow-up date reminders on applications. |
| **Tier 3** | **Public Alpha (Self-Hosted / Single Tenant)** | **BLOCKED (80% there)** | Fresh database boots with zero jobs and no clear user pathway to load jobs without Apify token. |
| **Tier 4** | **Multi-User Hosted SaaS MVP** | **EARLY STAGE (50% there)** | No self-serve password reset email delivery (Resend configured in env, but not in Better Auth), no billing, no team invitations UI. |

---

## 2. Detailed Tier-by-Tier Evaluation

### Tier 1: LinkedIn Announcement & Video Demo Readiness
- **Objective:** Record a 2-minute video walkthrough showcasing CareerOS: registering, importing a resume, seeing the Master Career Profile, matching against a real job, generating a targeted resume, and tracking the application in the CRM.
- **Current Verdict:** **NOT READY.**
- **The Exact Showstopper in a Demo:**
  1. The presenter cannot paste a real job posting they found on LinkedIn into the system. They are forced to rely on whatever 6 static jobs were seeded in development or hope the Apify scraper returns relevant jobs.
  2. When the presenter clicks "Targeted Resume" in the Job Details Drawer, the button spins and stops, but **nothing opens on screen**. The presenter would have to manually navigate to the Resumes tab, find the profile, open it, click the Versions tab, and click the version to show the result. This ruins the demo flow.
- **Path to Resolution:**
  - Implement Task T-01 (Add Job modal) and Task T-02 (direct link/redirect to the generated version).
  - **Estimated Time to Tier 1 Readiness:** **2 to 3 days**.

---

### Tier 2: Personal Job-Search Usability (Daily Driver)
- **Objective:** You can use CareerOS as your personal command center for your actual everyday job search.
- **Current Verdict:** **BLOCKED.**
- **Why You Cannot Use It Today:**
  1. You find a high-priority role on Greenhouse or Lever. You cannot paste that role's text into CareerOS to see how your Master Profile stacks up or generate a tailored LaTeX resume for it.
  2. You apply to 5 jobs. You cannot set a "Follow up by next Tuesday" reminder on any of them; you only have a freeform notes text area.
  3. You cannot see an ATS keyword comparison showing exactly which words from the job description are missing from your resume bullets.
- **Path to Resolution:**
  - Implement Tasks T-01, T-02, T-04, T-05, and T-06.
  - **Estimated Time to Tier 2 Readiness:** **1.5 to 2 weeks**.

---

### Tier 3: Public Alpha Readiness (Open-Source / Self-Hosted)
- **Objective:** External developers can clone the repository, run `docker compose up`, open `http://localhost:3000`, register, and immediately use the product without errors.
- **Current Verdict:** **BLOCKED.**
- **Why External Users Will Struggle:**
  1. **Empty Board Paradox:** On a fresh database, no jobs exist. If the user does not provide an `APIFY_API_TOKEN`, clicking "Fetch Live Market Jobs" throws an error banner: *"Apify API token is not configured..."*. With no manual job entry, the user's Job Radar is permanently blank and unusable.
  2. **Production Seed vs Migration:** The Dockerfile runs `prisma migrate deploy`, but does not run `db:seed`. Without seed data or manual job entry, the product appears empty and broken out of the box.
- **Path to Resolution:**
  - Implement Task T-01 (Manual Job Entry).
  - Implement Task T-03 (Zero-Jobs Onboarding guidance and optional sample job loader).
  - **Estimated Time to Tier 3 Readiness:** **1 week**.

---

### Tier 4: Broader Multi-User SaaS Readiness
- **Objective:** Multi-tenant hosted application with external users signing up and managing workspaces independently.
- **Current Verdict:** **EARLY STAGE.**
- **Deferred Requirements:**
  - Password reset email workflows via Resend.
  - Organization member invitation UI.
  - User profile deletion / GDPR data export.
  - Billing / quota tiers.
- **Assessment:** Properly deferred. Not needed for initial open-source release or personal job hunting.

---

## 3. Deployment & Runtime Infrastructure Audit

### 3.1 Docker Compose Baseline
- `docker-compose.yml` defines 4 services:
  - `web`: Next.js 16 container on port 3000.
  - `api`: NestJS container on port 3001.
  - `postgres`: PostgreSQL 17 Alpine on port 5432 with health check `pg_isready`.
  - `redis`: Redis 7 Alpine on host port 6380 (mapped to container 6379).
- **Audit Finding:** The local Docker Compose setup is functional and reproducible. Containers were verified in Pass 1–5. Currently stopped locally, ready to be started when needed.

### 3.2 Environment Variables & Secret Management
- **Audit Finding:** No credentials or secrets are committed. All secrets are loaded through `.env` or injected via Docker / host environment.
- **Variable Verification:**
  - `DATABASE_URL`: Supported for local PostgreSQL and managed cloud PostgreSQL (e.g. Supabase pooler).
  - `BETTER_AUTH_SECRET`: Enforced min 32 chars.
  - `BYOK_ENCRYPTION_KEY`: 32-byte base64 key validated on API startup.
  - `CAREEROS_API_URL` & `NEXT_PUBLIC_APP_URL`: Properly aligned between web and API.
  - `APIFY_API_TOKEN`: Supported at platform level, but currently acts as an unintentional single-point-of-failure for job discovery due to lack of manual JD entry.

---

## 4. Critical Launch Blockers (Must Fix Before Public Sharing)

1. **[CRITICAL - P0] Manual Job Creation & Normalization:**
   - Must allow any user to paste a Job Title, Company, and Job Description text.
   - Automatically normalizes skills, remote status, and computes deterministic match scores.
2. **[CRITICAL - P0] Targeted Resume Creation Feedback & Link:**
   - Must provide an immediate toast, modal, or redirect when clicking "Targeted Resume" in the drawer so the user can inspect the generated version.
3. **[CRITICAL - P0] First-Run Empty State in Job Radar:**
   - Must show a welcoming empty state guiding the user to "Paste your first job description" or "Explore sample jobs".
4. **[USABILITY - P1] Application Follow-Up Date Field:**
   - Must allow setting a target follow-up date on applications to enable real job search management.
5. **[USABILITY - P1] Structured Recommendation Review:**
   - Must provide an explainable view in Resume Studio showing what evidence was prioritized for a targeted version.

---

## 5. Timeline to Milestones

| Milestone | Realistic Target | Conditions for Success |
|---|---|---|
| **LinkedIn Announcement & Video Walkthrough** | **3 Days** | Complete Tasks T-01, T-02, and T-03. Record clean demo video. |
| **Personal Job-Search MVP (Daily Driver)** | **10–14 Days** | Complete Tasks T-01 through T-07. Actively run personal search. |
| **Public Alpha Release (GitHub Repo / Self-Host)** | **2–3 Weeks** | Complete Milestones 1 & 2 + documentation and setup guide. |
| **Hosted Multi-User Beta** | **6–8 Weeks** | Add email verification, OAuth providers, and hosted managed DB. |

---

## 6. Immediate Next Implementation Task

The very first implementation task that should be executed immediately following this audit is:

### **Task T-01: Manual Job Creation & Normalization**
- Expose `POST /workspaces/:workspaceId/jobs` on NestJS `JobsController`.
- Expose `POST /api/jobs` on Next.js BFF.
- Build the "Add Job" modal dialog in `apps/web/components/jobs/add-job-dialog.tsx`.
- Connect the button to `JobBoard` so newly pasted jobs appear instantly with full match scores and skills breakdown.

This unlocks the entire CareerOS value chain.
