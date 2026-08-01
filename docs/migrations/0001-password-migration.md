# Migrating existing users off custom JWT auth

## The problem

The old schema stored `users.password_hash` as a **bcrypt** hash. Better
Auth's email/password provider stores credentials as a **scrypt** hash on
`accounts.password` (`accounts.provider_id = 'credential'`). These are not
interchangeable — you cannot convert a bcrypt hash into a scrypt hash
without the plaintext password, and we don't have (and shouldn't want) the
plaintext.

There is no purely automatic migration path for existing passwords. Two
real options:

### Option A — Forced reset (recommended)

1. Run the migration below, which moves every existing user into the new
   schema *without* a credential row (so they have no working password).
2. Trigger a "reset your password" email to all existing users (Better
   Auth's `forgetPassword` endpoint) as part of the deploy communication.
3. On next login, users set a new password, which Better Auth stores
   correctly as scrypt from that point on.

This is simplest, safest, and the approach most teams take. It requires
transactional email to be wired up (Resend, per Phase 9 of the v2
workflow) before you deploy this migration.

### Option B — Verify-then-upgrade (no forced reset, more code)

Keep the old bcrypt hash around in a side column temporarily, and add a
custom sign-in check: on login, if no `Account` row exists yet, verify the
submitted password against the legacy bcrypt hash, and if it matches,
create the `Account` row with a freshly-computed scrypt hash of that same
password (which you now have in plaintext, in-memory, for that one
request). This avoids a forced reset but means writing and maintaining a
one-time custom auth hook, and keeping bcrypt as a dependency until every
user has logged in once post-migration. Given how few users the app likely
has before v2 ships, this is probably not worth the complexity — Option A
is the pragmatic choice.

## Running the schema migration

```bash
cd apps/api
pnpm prisma migrate dev --name better_auth_core_tables
```

This applies the schema changes in `prisma/schema.prisma`:
adds `sessions`, `accounts`, `verifications`; adds `email_verified` to
`users`; adds `logo` to `workspaces`; changes `workspace_members.role`
from an enum to a string; drops `users.password_hash`.

**Back up your database before running this in anything but a fresh dev
environment** — dropping `password_hash` is destructive, and there's no
automatic path back to the old JWT system afterward.

## Flagging existing accounts (Option A)

`tooling/scripts/src/flag-legacy-accounts.ts` (added alongside this doc)
prints every user who existed before the migration and has no `Account`
row yet — i.e., needs the password-reset email. Run it after the schema
migration, before sending the reset campaign:

```bash
cd apps/api
pnpm tsx ../../tooling/scripts/src/flag-legacy-accounts.ts
```
