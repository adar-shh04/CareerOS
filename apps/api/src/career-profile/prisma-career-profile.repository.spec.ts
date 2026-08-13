import { randomUUID } from 'node:crypto';

import { PrismaService } from '../database/prisma.service';
import type { MasterCareerProfile } from './career-profile.types';
import { PrismaCareerProfileRepository } from './prisma-career-profile.repository';

const describeWithDatabase = process.env.DATABASE_URL
  ? describe
  : describe.skip;

describeWithDatabase('PrismaCareerProfileRepository', () => {
  const workspaceId = randomUUID();
  const otherWorkspaceId = randomUUID();
  const profileId = randomUUID();
  const projectId = randomUUID();
  const prismaService = new PrismaService();
  const repository = new PrismaCareerProfileRepository(prismaService);

  afterAll(async () => {
    await prismaService.client.masterCareerProfile.deleteMany({
      where: { organizationId: { in: [workspaceId, otherWorkspaceId] } },
    });
    await prismaService.client.organization.deleteMany({
      where: { id: { in: [workspaceId, otherWorkspaceId] } },
    });
    await prismaService.onModuleDestroy();
  });

  it('persists isolated profile records and versions a replacement atomically', async () => {
    const ownerId = randomUUID();
    await prismaService.client.user.create({
      data: {
        id: ownerId,
        email: `test-${ownerId}@careeros.local`,
        name: 'Test Owner',
      },
    });

    await prismaService.client.organization.createMany({
      data: [
        {
          id: workspaceId,
          name: 'Repository test workspace',
          slug: `workspace-${workspaceId}`,
        },
        {
          id: otherWorkspaceId,
          name: 'Other repository test workspace',
          slug: `workspace-${otherWorkspaceId}`,
        },
      ],
    });

    const initialProfile: MasterCareerProfile = {
      id: profileId,
      workspaceId,
      version: 1,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z',
      identity: { fullName: 'Example Candidate' },
      education: [],
      experiences: [],
      projects: [
        {
          id: projectId,
          name: 'CareerOS',
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

    await expect(repository.save(initialProfile)).resolves.toMatchObject({
      workspaceId,
      version: 1,
      projects: [{ id: projectId, name: 'CareerOS' }],
    });
    await expect(
      repository.findByWorkspace(otherWorkspaceId),
    ).resolves.toBeUndefined();

    const updatedProfile: MasterCareerProfile = {
      ...initialProfile,
      version: 2,
      updatedAt: '2026-07-22T00:01:00.000Z',
      projects: [
        {
          id: projectId,
          name: 'CareerOS',
          technologies: ['TypeScript', 'PostgreSQL', 'Prisma'],
        },
      ],
    };

    await expect(repository.save(updatedProfile)).resolves.toMatchObject({
      version: 2,
      projects: [
        {
          id: projectId,
          technologies: ['TypeScript', 'PostgreSQL', 'Prisma'],
        },
      ],
    });
    await expect(
      repository.findByWorkspace(workspaceId),
    ).resolves.toMatchObject({
      id: profileId,
      version: 2,
    });
  });
});
