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
  const demoPassword = 'CareerOS2026!';
  const demoName = 'Alex Rivera';

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
    include: { memberships: { include: { workspace: true } } },
  });
  const workspace = user.memberships[0]?.workspace;

  if (workspace) {
    await prisma.masterCareerProfile.create({
      data: {
        workspaceId: workspace.id,
        fullName: demoName,
        headline: 'Staff Fullstack & AI Engineer',
        location: 'San Francisco, CA',
        email: demoEmail,
      },
    });
  }

  console.log('Seed complete.');
  console.log(`  Demo user: ${demoEmail}`);
  console.log(`  Demo password: ${demoPassword}`);
  console.log(`  Workspace: ${workspace?.name ?? '(none created)'}`);
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
