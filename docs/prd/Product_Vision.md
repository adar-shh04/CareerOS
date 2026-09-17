# Product Vision and Core User Flow

## Problem

Job seekers repeat the same work across job boards, employer portals, resume files, spreadsheets, email, and calendars. Listing volume creates noise rather than better choices, and relationship context is easily lost.

## Product promise

CareerOS turns fragmented job-search work into a deliberate system: find the right opportunities, understand why they fit, prepare the right materials, manage relationships, and learn from results.

## Primary user

The initial power user is **Adarsh**, a job seeker who maintains role-specific resumes and a master cover-letter format, wants a short ranked list of high-potential jobs rather than endless listings, and wants repetitive research and preparation automated. The product must generalize this workflow to all users; no product data or behavior may be hardcoded for Adarsh.

## Primary workflow

1. A user defines career goals, constraints, preferences, and a Master Career Profile.
2. Job-source plugins collect authorized job data into a canonical job model.
3. Job Intelligence normalizes, deduplicates, filters, and calculates an explainable Opportunity Score.
4. The user reviews a concise ranked queue and sees the best resume profile plus the reasons.
5. CareerOS prepares an application workspace: job link, documents, tailored cover-letter draft, checklist, and outreach plan.
6. The user applies through the employer portal and records the action.
7. CareerOS tracks follow-ups, interview steps, and outcome data to improve future recommendations.

## Non-goals

- Auto-submitting applications.
- Mass emailing, unsolicited bulk messaging, or private-contact harvesting.
- Replacing user judgment with opaque scoring.
- Building every external integration before validating the core workflow.

## Success measures

- Time from job discovery to prepared application.
- Percentage of recommended jobs that users save or apply to.
- Interview and response rates by resume profile and role category.
- Follow-up completion and ethical outreach response rate.
- Ability for a user to understand and correct a recommendation.
