const { randomUUID } = require('node:crypto');
const { PrismaService } = require('./src/database/prisma.service');
const { PrismaCareerProfileRepository } = require('./src/career-profile/prisma-career-profile.repository');

const prisma = new PrismaService();
const repo = new PrismaCareerProfileRepository(prisma);

(async () => {
  const ownerId = randomUUID();
  const workspaceId = randomUUID();
  const profileId = randomUUID();
  const projectId = randomUUID();

  await prisma.client.user.create({
    data: {
      id: ownerId,
      email: `persist-${ownerId}@careeros.local`,
      name: 'Persist Test User',
      emailVerified: false,
    },
  });

  await prisma.client.workspace.create({
    data: {
      id: workspaceId,
      name: 'Persist Test Workspace',
      slug: `persist-${workspaceId.slice(0, 8)}`,
      ownerId,
    },
  });

  const initial = {
    id: profileId,
    workspaceId,
    version: 1,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    identity: {
      fullName: 'Persist Test Candidate',
      headline: 'Staff Engineer',
      location: 'Remote',
      email: 'persist@example.com',
    },
    education: [],
    experiences: [],
    projects: [
      {
        id: projectId,
        name: 'CareerOS',
        description: 'Initial build',
        technologies: ['TypeScript', 'PostgreSQL'],
      },
    ],
    achievements: [],
    skills: [],
    technologies: [],
    publications: [],
    hackathons: [],
    certifications: [],
    links: [],
  };

  const created = await repo.save(initial);
  const fetched = await repo.findByWorkspace(workspaceId);

  const updated = await repo.save({
    ...created,
    version: 2,
    updatedAt: '2026-08-01T00:01:00.000Z',
    projects: [
      {
        ...created.projects[0],
        technologies: ['TypeScript', 'PostgreSQL', 'Prisma'],
      },
    ],
  });

  const fetchedUpdated = await repo.findByWorkspace(workspaceId);

  console.log(JSON.stringify({
    createdVersion: created.version,
    createdProjectName: created.projects[0]?.name,
    fetchedWorkspaceId: fetched?.workspaceId,
    updatedVersion: updated.version,
    updatedTechnologies: updated.projects[0]?.technologies,
    fetchedUpdatedVersion: fetchedUpdated?.version,
    fetchedUpdatedProjectName: fetchedUpdated?.projects[0]?.name,
  }, null, 2));

  await prisma.client.masterCareerProfile.deleteMany({ where: { workspaceId } });
  await prisma.client.workspace.deleteMany({ where: { id: workspaceId } });
  await prisma.client.user.deleteMany({ where: { id: ownerId } });
  await prisma.onModuleDestroy();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
