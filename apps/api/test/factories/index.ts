import { createHash, randomUUID } from 'node:crypto';

import type { PrismaClient } from '../../src/generated/prisma/client';

export interface TestUserOverrides {
  id?: string;
  email?: string;
  name?: string;
  avatar?: string;
}

export async function createTestUser(
  prisma: PrismaClient,
  overrides: TestUserOverrides = {},
) {
  const id = overrides.id ?? randomUUID();
  const email = overrides.email ?? `user-${id.slice(0, 8)}@test.careeros.local`;
  const name = overrides.name ?? 'Test User';

  return prisma.user.create({
    data: {
      id,
      email,
      name,
      avatar: overrides.avatar ?? null,
      emailVerified: true,
    },
  });
}

export interface TestWorkspaceOverrides {
  id?: string;
  name?: string;
  slug?: string;
  metadata?: Record<string, unknown>;
  ownerUserId?: string;
}

export async function createTestWorkspace(
  prisma: PrismaClient,
  overrides: TestWorkspaceOverrides = {},
) {
  const id = overrides.id ?? randomUUID();
  const name = overrides.name ?? 'Test Workspace';
  const slug = overrides.slug ?? `workspace-${id.slice(0, 8)}`;
  const metadata = JSON.stringify(
    overrides.metadata ?? { completedAt: new Date().toISOString() },
  );

  const org = await prisma.organization.create({
    data: {
      id,
      name,
      slug,
      metadata,
    },
  });

  if (overrides.ownerUserId) {
    await prisma.member.create({
      data: {
        id: randomUUID(),
        organizationId: id,
        userId: overrides.ownerUserId,
        role: 'owner',
      },
    });
  }

  return org;
}

export interface TestMasterProfileOverrides {
  fullName?: string;
  headline?: string;
  location?: string;
  email?: string;
  experiences?: {
    title: string;
    company: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    skills?: string[];
  }[];
  skills?: {
    name: string;
    category?: string;
  }[];
}

export async function createTestMasterProfile(
  prisma: PrismaClient,
  workspaceId: string,
  overrides: TestMasterProfileOverrides = {},
) {
  const profile = await prisma.masterCareerProfile.create({
    data: {
      id: randomUUID(),
      organizationId: workspaceId,
      fullName: overrides.fullName ?? 'Jane Doe',
      headline: overrides.headline ?? 'Senior Systems Architect',
      location: overrides.location ?? 'San Francisco, CA',
      email: overrides.email ?? 'jane@test.careeros.local',
    },
  });

  if (overrides.experiences && overrides.experiences.length > 0) {
    for (const exp of overrides.experiences) {
      await prisma.experienceEntry.create({
        data: {
          id: randomUUID(),
          profileId: profile.id,
          title: exp.title,
          company: exp.company,
          startDate: exp.startDate ?? '2022-01',
          endDate: exp.endDate ?? 'Present',
          description: exp.description ?? 'Leading engineering initiatives',
          technologies: exp.skills ?? [],
        },
      });
    }
  }

  if (overrides.skills && overrides.skills.length > 0) {
    for (const skill of overrides.skills) {
      await prisma.skillEntry.create({
        data: {
          id: randomUUID(),
          profileId: profile.id,
          name: skill.name,
          category: skill.category ?? 'Core',
        },
      });
    }
  }

  return profile;
}

export interface TestResumeProfileOverrides {
  id?: string;
  name?: string;
  roleFocus?: string;
  visibleSections?: string[];
  sectionOrder?: string[];
}

export async function createTestResumeProfile(
  prisma: PrismaClient,
  workspaceId: string,
  overrides: TestResumeProfileOverrides = {},
) {
  const id = overrides.id ?? randomUUID();
  return prisma.resumeProfile.create({
    data: {
      id,
      organizationId: workspaceId,
      name: overrides.name ?? 'Senior Backend Resume Profile',
      roleFocus: overrides.roleFocus ?? 'Backend Systems',
      visibleSections: overrides.visibleSections ?? [
        'summary',
        'experience',
        'skills',
      ],
      sectionOrder: overrides.sectionOrder ?? [
        'summary',
        'experience',
        'skills',
      ],
      highlightRules: [],
      priorityProjectIds: [],
      prioritySkillIds: [],
      priorityExperienceIds: [],
      priorityAchievementIds: [],
      priorityCertificationIds: [],
      styleSettings: {},
    },
  });
}

export interface TestResumeVersionOverrides {
  id?: string;
  targetCompany?: string;
  targetRole?: string;
  masterProfileSnapshot?: Record<string, unknown>;
  selectedRecordIds?: Record<string, unknown>;
  outputFormat?: 'HTML' | 'LATEX' | 'PDF';
}

export async function createTestResumeVersion(
  prisma: PrismaClient,
  workspaceId: string,
  resumeProfileId: string,
  overrides: TestResumeVersionOverrides = {},
) {
  const id = overrides.id ?? randomUUID();
  return prisma.resumeVersion.create({
    data: {
      id,
      organizationId: workspaceId,
      resumeProfileId,
      targetCompany: overrides.targetCompany ?? 'Stripe',
      targetRole: overrides.targetRole ?? 'Staff Infrastructure Engineer',
      masterProfileSnapshot: overrides.masterProfileSnapshot ?? {
        identity: { fullName: 'Jane Doe' },
      },
      selectedRecordIds: overrides.selectedRecordIds ?? {},
      outputFormat: overrides.outputFormat ?? 'LATEX',
    },
  });
}

export interface TestJobOverrides {
  id?: string;
  company?: string;
  title?: string;
  location?: string;
  isRemote?: boolean;
  requiredSkills?: string[];
  preferredSkills?: string[];
  salaryRange?: string;
  description?: string;
}

export async function createTestJob(
  prisma: PrismaClient,
  overrides: TestJobOverrides = {},
) {
  const id = overrides.id ?? randomUUID();
  const company = overrides.company ?? 'Linear';
  const title = overrides.title ?? 'Senior Product Engineer';
  const location = overrides.location ?? 'San Francisco, CA';

  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  const fingerprint = createHash('sha256')
    .update(`${clean(company)}|${clean(title)}|${clean(location)}`)
    .digest('hex');

  return prisma.job.create({
    data: {
      id,
      company,
      title,
      location,
      fingerprint,
      isRemote: overrides.isRemote ?? true,
      requiredSkills: overrides.requiredSkills ?? [
        'TypeScript',
        'React',
        'Node.js',
      ],
      preferredSkills: overrides.preferredSkills ?? ['GraphQL', 'PostgreSQL'],
      salaryRange: overrides.salaryRange ?? '$160,000 - $210,000',
      description:
        overrides.description ??
        'Building real-time sync engines and reactive UI.',
      postedAt: new Date(),
    },
  });
}

export interface TestApplicationOverrides {
  id?: string;
  status?: string;
  notes?: string;
  appliedAt?: Date | null;
  resumeProfileId?: string | null;
  resumeVersionId?: string | null;
}

export async function createTestApplication(
  prisma: PrismaClient,
  workspaceId: string,
  jobId: string,
  overrides: TestApplicationOverrides = {},
) {
  const id = overrides.id ?? randomUUID();
  const status = overrides.status ?? 'saved';

  return prisma.$transaction(async (tx) => {
    const app = await tx.application.create({
      data: {
        id,
        organizationId: workspaceId,
        jobId,
        status,
        notes: overrides.notes ?? null,
        appliedAt:
          overrides.appliedAt ?? (status === 'applied' ? new Date() : null),
        resumeProfileId: overrides.resumeProfileId ?? null,
        resumeVersionId: overrides.resumeVersionId ?? null,
      },
    });

    await tx.applicationStatusHistory.create({
      data: {
        id: randomUUID(),
        applicationId: id,
        status,
        notes: `Application created with status "${status}"`,
      },
    });

    await tx.workspaceJobState.upsert({
      where: {
        organizationId_jobId: {
          organizationId: workspaceId,
          jobId,
        },
      },
      create: {
        id: randomUUID(),
        organizationId: workspaceId,
        jobId,
        status: status === 'applied' ? 'applied' : 'saved',
        isSaved: true,
        isDismissed: false,
        appliedAt: status === 'applied' ? new Date() : null,
      },
      update: {
        status: status === 'applied' ? 'applied' : 'saved',
        isSaved: true,
      },
    });

    return app;
  });
}

export async function cleanTestWorkspace(
  prisma: PrismaClient,
  workspaceId: string,
) {
  await prisma.applicationStatusHistory.deleteMany({
    where: { application: { organizationId: workspaceId } },
  });
  await prisma.application.deleteMany({
    where: { organizationId: workspaceId },
  });
  await prisma.workspaceJobState.deleteMany({
    where: { organizationId: workspaceId },
  });
  await prisma.jobMatch.deleteMany({
    where: { organizationId: workspaceId },
  });
  await prisma.resumeVersion.deleteMany({
    where: { organizationId: workspaceId },
  });
  await prisma.resumeProfile.deleteMany({
    where: { organizationId: workspaceId },
  });
  await prisma.masterCareerProfile.deleteMany({
    where: { organizationId: workspaceId },
  });
  await prisma.byokCredential.deleteMany({
    where: { organizationId: workspaceId },
  });
  await prisma.member.deleteMany({
    where: { organizationId: workspaceId },
  });
  await prisma.organization.deleteMany({
    where: { id: workspaceId },
  });
}
