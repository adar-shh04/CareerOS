/**
 * Run after the Better Auth schema migration (see
 * docs/migrations/0001-password-migration.md). Lists every user who has
 * no `Account` row yet — meaning their old bcrypt password no longer
 * works and they need a "reset your password" email before they can log
 * in again.
 *
 * Usage:
 *   cd apps/api && pnpm tsx ../../tooling/scripts/src/flag-legacy-accounts.ts
 */
import { PrismaClient } from '../../../apps/api/src/generated/prisma/client';

async function main() {
  const prisma = new PrismaClient();

  const usersNeedingReset = await prisma.user.findMany({
    where: { accounts: { none: {} } },
    select: { id: true, email: true, name: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  if (usersNeedingReset.length === 0) {
    console.log('No legacy accounts found — nothing to do.');
    await prisma.$disconnect();
    return;
  }

  console.log(
    `${usersNeedingReset.length} user(s) need a password-reset email:\n`,
  );

  for (const user of usersNeedingReset) {
    console.log(`  ${user.email}${user.name ? ` (${user.name})` : ''}`);
  }

  console.log(
    '\nSend these through your reset-password flow (Better Auth\'s ' +
      "forgetPassword endpoint) before they'll be able to sign in again.",
  );

  await prisma.$disconnect();
}

void main();
