import { randomUUID } from 'node:crypto';

import type { MasterCareerProfile } from '../career-profile/career-profile.types';
import { PrismaService } from '../database/prisma.service';
import { PrismaResumeProfileRepository } from './prisma-resume-profile.repository';
import type {
  ResumeProfile,
  ResumeVersion,
  SelectedRecordIds,
} from './resume-profile.types';

const defaultSelectedRecords: SelectedRecordIds = {
  projectIds: [],
  skillIds: [],
  experienceIds: [],
  achievementIds: [],
  certificationIds: [],
};

function createTestSnapshot(workspaceId: string): MasterCareerProfile {
  return {
    id: randomUUID(),
    workspaceId,
    version: 1,
    identity: { fullName: 'Test User', email: 'test@careeros.local' },
    experiences: [],
    projects: [],
    skills: [],
    technologies: [],
    publications: [],
    hackathons: [],
    achievements: [],
    certifications: [],
    education: [],
    links: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const describeWithDatabase = process.env.DATABASE_URL
  ? describe
  : describe.skip;

describeWithDatabase(
  'D2: ResumeVersion compound FK integrity (PostgreSQL)',
  () => {
    const prismaService = new PrismaService();
    const repository = new PrismaResumeProfileRepository(prismaService);

    const orgA = randomUUID();
    const orgB = randomUUID();
    const userA = randomUUID();
    const userB = randomUUID();

    beforeAll(async () => {
      // Seed users and organizations
      await prismaService.client.user.createMany({
        data: [
          { id: userA, email: `userA-${userA}@careeros.local`, name: 'User A' },
          { id: userB, email: `userB-${userB}@careeros.local`, name: 'User B' },
        ],
      });

      await prismaService.client.organization.createMany({
        data: [
          {
            id: orgA,
            name: 'Workspace A',
            slug: `workspace-a-${orgA.slice(0, 8)}`,
          },
          {
            id: orgB,
            name: 'Workspace B',
            slug: `workspace-b-${orgB.slice(0, 8)}`,
          },
        ],
      });

      await prismaService.client.member.createMany({
        data: [
          {
            id: randomUUID(),
            organizationId: orgA,
            userId: userA,
            role: 'owner',
          },
          {
            id: randomUUID(),
            organizationId: orgB,
            userId: userB,
            role: 'owner',
          },
        ],
      });
    });

    afterAll(async () => {
      await prismaService.client.organization.deleteMany({
        where: { id: { in: [orgA, orgB] } },
      });
      await prismaService.client.user.deleteMany({
        where: { id: { in: [userA, userB] } },
      });
      await prismaService.onModuleDestroy();
    });

    it('valid case: creates and lists resume versions with matching workspace and profile', async () => {
      const profileId = randomUUID();
      const profile: ResumeProfile = {
        id: profileId,
        workspaceId: orgA,
        name: 'Software Engineer Profile',
        visibleSections: ['summary', 'experience', 'skills'],
        sectionOrder: ['summary', 'experience', 'skills'],
        highlightRules: [],
        priorityProjectIds: [],
        prioritySkillIds: [],
        priorityExperienceIds: [],
        priorityAchievementIds: [],
        priorityCertificationIds: [],
        styleSettings: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await repository.create(profile);

      const versionId = randomUUID();
      const version: ResumeVersion = {
        id: versionId,
        workspaceId: orgA,
        resumeProfileId: profileId,
        targetCompany: 'Linear',
        targetRole: 'Product Engineer',
        masterProfileSnapshot: createTestSnapshot(orgA),
        selectedRecordIds: defaultSelectedRecords,
        outputFormat: 'html',
        createdAt: new Date().toISOString(),
      };

      const created = await repository.createVersion(version);
      expect(created.id).toBe(versionId);
      expect(created.workspaceId).toBe(orgA);
      expect(created.resumeProfileId).toBe(profileId);

      const listed = await repository.listVersions(orgA, profileId);
      expect(listed).toHaveLength(1);
      expect(listed[0]?.id).toBe(versionId);
    });

    it('invalid case: rejects inserting a resume version pointing to another workspace profile (compound FK violation)', async () => {
      // Create profile in Workspace A
      const profileAId = randomUUID();
      const profileA: ResumeProfile = {
        id: profileAId,
        workspaceId: orgA,
        name: 'Workspace A Profile',
        visibleSections: [],
        sectionOrder: [],
        highlightRules: [],
        priorityProjectIds: [],
        prioritySkillIds: [],
        priorityExperienceIds: [],
        priorityAchievementIds: [],
        priorityCertificationIds: [],
        styleSettings: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await repository.create(profileA);

      // Attempt to create a version in Workspace B pointing to profileAId (cross-tenant mismatch)
      const rogueVersionId = randomUUID();
      const rogueVersion: ResumeVersion = {
        id: rogueVersionId,
        workspaceId: orgB, // Workspace B
        resumeProfileId: profileAId, // belongs to Workspace A!
        targetCompany: 'Evil Corp',
        targetRole: 'Intruder',
        masterProfileSnapshot: createTestSnapshot(orgB),
        selectedRecordIds: defaultSelectedRecords,
        outputFormat: 'html',
        createdAt: new Date().toISOString(),
      };

      // Must be rejected by PostgreSQL foreign key constraint
      await expect(repository.createVersion(rogueVersion)).rejects.toThrow();

      // Verify raw query also fails at database level
      await expect(
        prismaService.client.resumeVersion.create({
          data: {
            id: randomUUID(),
            organizationId: orgB,
            resumeProfileId: profileAId,
            masterProfileSnapshot: {},
            selectedRecordIds: {},
            outputFormat: 'HTML',
          },
        }),
      ).rejects.toThrow();
    });

    it('invalid case: rejects inserting a resume version pointing to non-existent organization', async () => {
      const nonExistentOrg = randomUUID();
      const fakeProfileId = randomUUID();

      await expect(
        prismaService.client.resumeVersion.create({
          data: {
            id: randomUUID(),
            organizationId: nonExistentOrg,
            resumeProfileId: fakeProfileId,
            masterProfileSnapshot: {},
            selectedRecordIds: {},
            outputFormat: 'HTML',
          },
        }),
      ).rejects.toThrow();
    });

    it('cascade: deleting the parent resume profile cascades and removes its versions', async () => {
      const profileId = randomUUID();
      const profile: ResumeProfile = {
        id: profileId,
        workspaceId: orgA,
        name: 'Cascading Profile',
        visibleSections: [],
        sectionOrder: [],
        highlightRules: [],
        priorityProjectIds: [],
        prioritySkillIds: [],
        priorityExperienceIds: [],
        priorityAchievementIds: [],
        priorityCertificationIds: [],
        styleSettings: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await repository.create(profile);

      const versionId = randomUUID();
      await repository.createVersion({
        id: versionId,
        workspaceId: orgA,
        resumeProfileId: profileId,
        targetCompany: 'Vercel',
        targetRole: 'Platform Engineer',
        masterProfileSnapshot: createTestSnapshot(orgA),
        selectedRecordIds: defaultSelectedRecords,
        outputFormat: 'latex',
        createdAt: new Date().toISOString(),
      });

      // Verify version exists
      const before = await repository.listVersions(orgA, profileId);
      expect(before).toHaveLength(1);

      // Delete profile
      await repository.delete(orgA, profileId);

      // Verify version is gone
      const after = await prismaService.client.resumeVersion.findUnique({
        where: { id: versionId },
      });
      expect(after).toBeNull();
    });
  },
);
