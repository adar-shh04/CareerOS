import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../apps/api/src/generated/prisma/client';

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required.');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

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