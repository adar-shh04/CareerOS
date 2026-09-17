# Resume Intelligence Requirements

## Outcome

Let users maintain one trusted set of career facts and create targeted, measurable resume versions without manual file drift.

## Functional requirements

- Store a structured Master Career Profile: experience, projects, education, skills, achievements, certifications, publications, and links.
- Support unlimited named resume profiles with role focus, selected content, ordering, and template preferences.
- Import existing resume artifacts with provenance; parsing must be reviewable before it updates master data.
- Compare every profile against a job and recommend a profile with an explanation and confidence.
- Create immutable generated resume versions, preserving input snapshot, template version, output artifact, and generation date.
- Associate applications and outcomes with the exact resume version used.
- Support a reusable cover-letter template with role/company/technology/mission/recipient personalization.

## Generation direction

The target pipeline is Master Career Profile → Resume Profile → Template → Compile → PDF. Local or containerized LaTeX compilation is preferred for repeatability; Overleaf can remain a user-managed authoring/export workflow unless a supported integration is later designed.

## Acceptance criteria

- Editing a profile or master record never mutates an existing generated resume version.
- Users can select a different recommended profile before preparing an application.
- The system can explain which job requirements each recommended profile addresses and which gaps remain.
