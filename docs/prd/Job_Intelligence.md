# Job Intelligence Requirements

## Outcome

Present each user with a reliable, concise, personalized job queue—not a feed of duplicates.

## Functional requirements

- Ingest jobs only through enabled, authorized plugins or user imports.
- Normalize source data into a canonical job record with source provenance and timestamps.
- Detect exact and likely duplicates using source/external IDs, normalized company, role, location, employment type, and description similarity.
- Preserve source links and merge provenance rather than silently deleting source records.
- Filter using explicit preferences and constraints, including role family, level, location, work mode, work authorization, compensation when available, and freshness.
- Calculate a versioned Opportunity Score that handles incomplete evidence safely.
- Recommend the best resume profile and show alternatives and confidence.
- Show reasons, caveats, source freshness, and missing data with every recommendation.
- Let users save, hide, snooze, correct, and override recommendations; use this feedback as reviewable Career Memory.

## Opportunity Score v1

Initial default components: resume fit (35%), experience fit (20%), skill-gap readiness (10%), location/work-authorization fit (10%), competition signal (10%), hiring velocity (5%), referral potential (5%), and company preference (5%).

Weights are an initial configuration, not a permanent truth. The UI must avoid implying precision when components are unknown. Scores include a confidence level and a factor-by-factor explanation.

## Acceptance criteria

- A duplicate listing from two sources appears as one opportunity with both sources visible.
- A user can see why a role is recommended, which evidence is missing, and why a resume was selected.
- A user can edit preferences and see the score recalculate without changing historical scoring records.
- No integration bypasses source permissions or exposes credentials in the client.
