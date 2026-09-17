# Outreach and Relationship Intelligence Requirements

## Outcome

Help users build genuine, well-organized professional relationships around opportunities without automating spam or collecting private data.

## Functional requirements

- Create tenant-scoped company workspaces containing jobs, contacts, public company context, notes, applications, outreach history, and interview notes.
- Store structured contacts with role, company, department, location, public links, public email only when authorized, relationship status, history, and notes.
- Model relationships between a user, people, companies, schools/alumni, roles, referrals, and interactions.
- Rank contacts using transparent relevance signals such as role, team proximity, shared affiliation, and existing relationship history.
- Recommend user-reviewed next actions: apply, connect, message, request referral, follow up, archive, or defer.
- Generate individualized email, connection, referral, thank-you, and follow-up drafts using only authorized context.
- Track outreach events, outcomes, follow-up reminders, and user-provided notes.
- Support optional user-authorized integrations for mail drafts/sending and calendar reminders.

## Guardrails

- Never bulk-send, generate campaigns, or contact people without user review.
- Never scrape private contact data or circumvent platform controls.
- Clearly label public/imported/user-entered contact provenance.
- Keep user relationship notes private to their tenant unless explicit sharing is introduced later.

## Acceptance criteria

- A recommendation explains why a person is relevant to a role.
- The user can review and edit every generated message before any external action.
- Follow-up reminders are created from user-confirmed events and can be changed or dismissed.
