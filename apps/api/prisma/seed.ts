import { PrismaPg } from '@prisma/adapter-pg';

import { auth } from '../src/auth/better-auth.instance';
import { PrismaClient } from '../src/generated/prisma/client';

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://careeros:careeros@localhost:5432/careeros?schema=public';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main(): Promise<void> {
  const demoEmail = 'demo@careeros.dev';
  const demoPassword =
    process.env.SEED_USER_PASSWORD || process.env.DEMO_USER_PASSWORD;
  const demoName = 'Alex Rivera';

  if (!demoPassword) {
    console.error(
      'Error: SEED_USER_PASSWORD environment variable is required to run the development seed.\n' +
        'Example: SEED_USER_PASSWORD="YourLocalDevPassword" pnpm --filter careeros-api db:seed',
    );
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  if (existing) {
    console.log('Seed data already exists — skipping.');
    return;
  }

  // Going through Better Auth's own API (rather than writing User/Account
  // rows by hand) means the password gets hashed the way Better Auth
  // expects (scrypt, not bcrypt), and the databaseHooks.user.create.after
  // hook fires to create the workspace automatically — same as any real
  // signup.
  await auth.api.signUpEmail({
    body: {
      email: demoEmail,
      password: demoPassword,
      name: demoName,
    },
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: { email: demoEmail },
    include: { memberships: { include: { organization: true } } },
  });
  const organization = user.memberships[0]?.organization;

  if (organization) {
    await prisma.masterCareerProfile.create({
      data: {
        organizationId: organization.id,
        fullName: demoName,
        headline: 'Staff Fullstack & AI Engineer',
        location: 'San Francisco, CA',
        email: demoEmail,
      },
    });
  }

  console.log('Seed complete (development only).');
  console.log(`  Demo user: ${demoEmail}`);
  console.log(`  Workspace: ${organization?.name ?? '(none created)'}`);
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
