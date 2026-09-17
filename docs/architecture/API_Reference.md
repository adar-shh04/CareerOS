# CareerOS API Reference

**Last updated:** 2026-09-08  
**Base URL:** `http://localhost:3001` (development)  
**Authentication:** All endpoints require a valid Better Auth session cookie.  
**Multi-tenancy:** Workspace-scoped endpoints also require membership in the workspace organization via `WorkspaceMemberGuard`.

---

## Authentication

### `POST /api/auth/sign-up/email`
Create a new user account.

**Body:** `{ email, password, name }`

### `POST /api/auth/sign-in/email`
Sign in and receive a session cookie.

**Body:** `{ email, password }`

### `POST /api/auth/sign-out`
Invalidate the current session.

---

## Workspace / Onboarding

### `POST /workspaces/onboarding`
Complete onboarding. Creates or updates the workspace, seeds the Master Career Profile and initial Resume Profile.

**Body:**
```json
{
  "name": "string",
  "workspaceName": "string",
  "field": "string (e.g. Software Engineering, Healthcare, Finance)",
  "targetRole": "string",
  "careerDirection": "string",
  "skills": ["string"],
  "locationPreference": "string",
  "workArrangement": "remote | hybrid | onsite | any",
  "jobSearchPreferences": {}
}
```

**Note:** `field` accepts any career field — not restricted to Software Engineering.  
**Note:** BYOK configuration is never required during onboarding.

### `GET /workspaces/:workspaceId`
Return workspace metadata for the authenticated user.

---

## Master Career Profile

### `GET /workspaces/:workspaceId/career-profile`
Return the full Master Career Profile.

**Response:** Full profile including identity, experiences, education, skills, technologies, projects, achievements, certifications, publications, hackathons, links.

### `POST /workspaces/:workspaceId/career-profile`
Create or update the Master Career Profile (upsert).

**Body:** `MasterCareerProfileInput` — all sections optional; increments `version` on each save.  
**Note:** Client temporary IDs (e.g. `exp-1`, `skill-123`) are accepted and normalized to canonical UUIDs automatically.

---

## Resume Profiles

### `GET /workspaces/:workspaceId/resume-profiles`
List all Resume Profiles in the workspace.

### `POST /workspaces/:workspaceId/resume-profiles`
Create a new Resume Profile. LaTeX source is auto-generated from the Master Career Profile.

**Body:**
```json
{
  "name": "string (required)",
  "roleFocus": "string",
  "visibleSections": ["identity", "summary", "experience", "skills", "projects", "education"],
  "sectionOrder": ["identity", "summary", "experience", "skills", "projects", "education"],
  "prioritySkillIds": ["uuid"],
  "priorityProjectIds": ["uuid"],
  "priorityExperienceIds": ["uuid"],
  "priorityAchievementIds": ["uuid"],
  "priorityCertificationIds": ["uuid"],
  "summaryGuidance": "string",
  "latexSource": "string (optional — if omitted, canonical template is generated)"
}
```

### `GET /workspaces/:workspaceId/resume-profiles/:profileId`
Return a single Resume Profile including its `latexSource`.

### `PUT /workspaces/:workspaceId/resume-profiles/:profileId`
Update a Resume Profile.

### `DELETE /workspaces/:workspaceId/resume-profiles/:profileId`
Delete a Resume Profile.

### `POST /workspaces/:workspaceId/resume-profiles/parse`
Parse a resume file (PDF, DOCX, or TXT) and extract structured career data.

**Form data:** `file` (multipart) **or** JSON body `{ resumeText, fileBase64, fileName, mimeType }`.

**Behavior:** Uses AI-enhanced extraction if an AI provider is configured; falls back to heuristic extraction otherwise. Never fails silently — always returns extracted data or a clear message.

### `POST /workspaces/:workspaceId/resume-profiles/import-latex`
Import an existing `.tex` source file into a new named Resume Profile.

**Body:** `{ name: string, latexSource: string, roleFocus?: string }`

### Resume Versions

#### `GET /workspaces/:workspaceId/resume-profiles/:profileId/versions`
List all versions for a Resume Profile.

#### `POST /workspaces/:workspaceId/resume-profiles/:profileId/versions`
Create a new Resume Version snapshot (requires Master Career Profile to exist).

#### `GET /workspaces/:workspaceId/resume-profiles/:profileId/versions/:versionId`
Return a specific Resume Version.

---

## Jobs

### `GET /workspaces/:workspaceId/jobs`
List jobs with automatic matching against the Master Career Profile. Results sorted by match score descending.

**Query params:** `query`, `location`, `remote` (boolean), `limit`, `offset`, `skills[]`, `status`.

### `POST /workspaces/:workspaceId/jobs/ingest`
Trigger job ingestion via the Apify LinkedIn adapter. If `APIFY_API_TOKEN` is not configured, returns a clear error.

**Body:** `{ query?, location?, limit?, source? }`  
**Note:** If `query` is omitted, derives it from the Master Career Profile headline (multi-field, not hardcoded to SWE).

### `GET /workspaces/:workspaceId/jobs/:jobId`
Return a single job with match result and workspace state.

### `POST /workspaces/:workspaceId/jobs/:jobId/match`
Re-compute and persist the match result for a specific job.

**Body:** `{ resumeProfileId?, weights? }`

### `POST /workspaces/:workspaceId/jobs/:jobId/save`
Mark a job as saved in the workspace.

### `POST /workspaces/:workspaceId/jobs/:jobId/dismiss`
Dismiss a job from the workspace.

### `POST /workspaces/:workspaceId/jobs/:jobId/restore`
Restore a previously dismissed job.

### `POST /workspaces/:workspaceId/jobs/:jobId/apply`
Mark a job as applied.

**Body:** `{ resumeProfileId?, notes? }`

### `GET /workspaces/:workspaceId/jobs/:jobId/analyze`
Return deterministic job analysis (match breakdown, skill gaps, evidence) for a job.

### `GET /workspaces/:workspaceId/jobs/:jobId/recommend-profile`
Return the best-matching Resume Profile for a job.

### `POST /workspaces/:workspaceId/jobs/:jobId/targeted-version`
Create a targeted Resume Version for a specific job.

**Body:** `{ resumeProfileId? }`

---

## Applications

### `GET /workspaces/:workspaceId/applications`
List all applications in the workspace, ordered by `updatedAt` descending.

### `POST /workspaces/:workspaceId/applications`
Create a new application.

**Body:**
```json
{
  "jobId": "uuid (required)",
  "status": "saved | applied | screening | interview | offer | rejected | withdrawn",
  "notes": "string",
  "appliedAt": "ISO date string",
  "resumeProfileId": "uuid (optional)",
  "resumeVersionId": "uuid (optional)"
}
```

### `GET /workspaces/:workspaceId/applications/:applicationId`
Return a single application with job summary.

### `PUT /workspaces/:workspaceId/applications/:applicationId`
Update an application (status, notes, appliedAt, resumeProfileId, resumeVersionId).

**Note:** Status transitions are automatically recorded in `ApplicationStatusHistory`.

### `DELETE /workspaces/:workspaceId/applications/:applicationId`
Delete an application.

### `GET /workspaces/:workspaceId/applications/:applicationId/history`
Return the full status transition history for an application.

---

## AI Coach

> **Capability-dependent.** All endpoints return `{ available: false, message: '...' }` when no AI provider is configured (BYOK or platform). No fabricated advice is ever returned.

### `POST /workspaces/:workspaceId/ai-coach/analyze`
Perform role-level AI analysis grounded in the Master Career Profile.

**Body:** `{ jobId?, targetRole?, resumeProfileId? }`

**Response:**
```json
{
  "available": true,
  "targetRole": "string",
  "company": "string",
  "matchingOverview": {
    "strengths": ["string"],
    "gaps": ["string"],
    "overallAdvice": "string"
  }
}
```

### `POST /workspaces/:workspaceId/ai-coach/section`
Get section-level coaching for one resume section.

**Body:** `{ section: "summary|experience|projects|skills|education", jobId?, targetRole? }`

**Response:** `{ available: boolean, recommendation?: { section, recommendedContent, explanation, keywordsAdded } }`

### `POST /workspaces/:workspaceId/ai-coach/apply-section`
Apply an accepted AI Coach recommendation to a Resume Profile.

**Body:** `{ resumeProfileId: uuid, section: string, content?: string, selectedRecordIds?: uuid[] }`

**Behavior:** Updates only the target Resume Profile (section priority fields + LaTeX source if present). Master Career Profile is never modified.

---

## Insights

### `GET /workspaces/:workspaceId/insights/market`
Return AI Market Intelligence.

**Behavior:**
- Returns `{ available: false, reason: '...', jobDataCount: 0 }` if no jobs are ingested.
- Returns `{ available: false, reason: '...' }` if AI is not configured.
- Returns real market analysis from ingested jobs when both are available.
- No hardcoded market statistics. No fabrication.

### `GET /workspaces/:workspaceId/insights/handbook`
Return the Career Handbook (offline, no AI or DB required).

**Response:** 7 career paths — Software Engineering, Data Analysis, Product Management, Design, Research, Healthcare, Finance — each with description, common roles, core skills, technologies, keywords, learning path, and study resources.

---

## BYOK

### `GET /workspaces/:workspaceId/byok`
List configured BYOK providers (returns provider names only — no keys returned).

### `POST /workspaces/:workspaceId/byok`
Store an encrypted API key for a provider.

**Body:** `{ provider: "openai|anthropic|google|mistral", apiKey: string }`

### `DELETE /workspaces/:workspaceId/byok/:provider`
Remove a BYOK credential for a provider.
