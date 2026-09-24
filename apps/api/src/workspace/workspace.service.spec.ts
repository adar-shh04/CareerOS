import { isOnboardingComplete } from '@repo/types';

import type { PrismaService } from '../database/prisma.service';
import { WorkspaceService } from './workspace.service';

describe('Onboarding completion contract', () => {
  describe('isOnboardingComplete (used by web gating)', () => {
    it.each([
      [null, false],
      [undefined, false],
      ['', false],
      ['not json', false],
      ['{}', false],
      [JSON.stringify({ field: 'Finance' }), false],
      [JSON.stringify({ completedAt: 'yesterday' }), false],
      [JSON.stringify({ completedAt: '2026-09-24T10:00:00.000Z' }), true],
      [{ completedAt: '2026-09-24T10:00:00.000Z' }, true], // Better Auth parsed form
      [{ completedAt: 42 }, false],
    ])('%p → %p', (metadata, expected) => {
      expect(isOnboardingComplete(metadata)).toBe(expected);
    });

    it('does not treat a named user as onboarded (no user.name heuristic)', () => {
      // A new account has a name from registration but its workspace has no
      // onboarding metadata yet.
      expect(isOnboardingComplete(null)).toBe(false);
    });
  });

  describe('WorkspaceService.completeOnboarding', () => {
    const userId = '00000000-0000-4000-8000-0000000000aa';
    const workspaceId = '00000000-0000-4000-8000-0000000000bb';

    const buildClient = () => {
      const client = {
        member: {
          findUnique: jest.fn().mockResolvedValue({
            organizationId: workspaceId,
            organization: { id: workspaceId },
          }),
          findFirst: jest.fn(),
        },
        user: {
          update: jest.fn().mockReturnValue('user-update'),
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: userId,
            email: 'a@b.c',
            name: 'Ana',
            avatar: null,
          }),
        },
        organization: {
          update: jest.fn().mockReturnValue('org-update'),
          create: jest.fn(),
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: workspaceId,
            name: 'Ana Workspace',
            slug: 'ana',
          }),
        },
        session: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
        masterCareerProfile: {
          findUnique: jest.fn().mockResolvedValue({ id: 'existing' }),
          create: jest.fn(),
        },
        resumeProfile: {
          findFirst: jest.fn().mockResolvedValue({ id: 'existing' }),
          create: jest.fn(),
        },
        $transaction: jest.fn().mockResolvedValue([]),
      };
      return client;
    };

    it('persists a completedAt marker that the gate recognizes, on the existing workspace', async () => {
      const client = buildClient();
      const service = new WorkspaceService({
        client,
      } as unknown as PrismaService);

      const result = await service.completeOnboarding(userId, workspaceId, {
        name: 'Ana',
        workspaceName: 'Ana Workspace',
        field: 'Finance',
      });

      const orgUpdate = client.organization.update.mock.calls[0] as [
        { where: { id: string }; data: { metadata: string } },
      ];
      expect(orgUpdate[0].where.id).toBe(workspaceId);
      expect(isOnboardingComplete(orgUpdate[0].data.metadata)).toBe(true);
      // No duplicate workspace is created when the user already has one.
      expect(client.organization.create).not.toHaveBeenCalled();
      // Existing master/resume profiles are kept, not re-seeded.
      expect(client.masterCareerProfile.create).not.toHaveBeenCalled();
      expect(client.resumeProfile.create).not.toHaveBeenCalled();
      expect(result.needsOnboarding).toBe(false);
    });

    it('seeds the first resume profile with canonical CareerOS LaTeX', async () => {
      const client = buildClient();
      client.resumeProfile.findFirst.mockResolvedValue(null);
      const service = new WorkspaceService({
        client,
      } as unknown as PrismaService);

      await service.completeOnboarding(userId, workspaceId, {
        name: 'Ana',
        workspaceName: 'Ana Workspace',
        targetRole: 'Analyst',
        skills: ['SQL'],
      });

      const created = client.resumeProfile.create.mock.calls[0] as [
        { data: { styleSettings: { latexSource: string } } },
      ];
      const latex = created[0].data.styleSettings.latexSource;
      expect(latex).toContain('\\header{Skills}');
      expect(latex).not.toMatch(/\{utf8\}/);
    });
  });
});
