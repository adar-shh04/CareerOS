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

  describe('WorkspaceService.ensureDefaultWorkspace', () => {
    const userId = '00000000-0000-4000-8000-0000000000cc';

    it('returns existing organization when membership already exists', async () => {
      const client = {
        member: {
          findFirst: jest.fn().mockResolvedValue({
            organizationId: 'existing-org-id',
            organization: {
              id: 'existing-org-id',
              name: 'Existing Org',
              slug: 'existing-org',
            },
          }),
        },
        session: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
        organization: { create: jest.fn() },
      };

      const service = new WorkspaceService({
        client,
      } as unknown as PrismaService);

      const result = await service.ensureDefaultWorkspace(
        userId,
        'Test User',
        'test@example.com',
      );

      expect(result.id).toBe('existing-org-id');
      expect(result.name).toBe('Existing Org');
      expect(client.organization.create).not.toHaveBeenCalled();
      expect(client.session.updateMany).toHaveBeenCalledWith({
        where: { userId, activeOrganizationId: null },
        data: { activeOrganizationId: 'existing-org-id' },
      });
    });

    it('creates new workspace with owner role when user has no membership', async () => {
      const client = {
        member: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
        session: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
        organization: {
          create: jest.fn().mockResolvedValue({
            id: 'new-org-id',
            name: "John's Workspace",
            slug: 'john-123',
          }),
        },
      };

      const service = new WorkspaceService({
        client,
      } as unknown as PrismaService);

      const result = await service.ensureDefaultWorkspace(
        userId,
        'John',
        'john@example.com',
      );

      expect(result.id).toBe('new-org-id');
      expect(result.name).toBe("John's Workspace");
      const firstCreateCall = client.organization.create.mock.calls[0] as [
        {
          data: {
            name: string;
            members: { create: { userId: string; role: string } };
          };
        },
      ];
      expect(firstCreateCall[0].data.name).toBe("John's Workspace");
      expect(firstCreateCall[0].data.members.create.role).toBe('owner');
      expect(client.session.updateMany).toHaveBeenCalledWith({
        where: { userId },
        data: { activeOrganizationId: 'new-org-id' },
      });
    });

    it('recovers gracefully from concurrent creation collision', async () => {
      let callCount = 0;
      const client = {
        member: {
          findFirst: jest.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) return Promise.resolve(null);
            return Promise.resolve({
              organizationId: 'collided-org-id',
              organization: {
                id: 'collided-org-id',
                name: 'Collided Org',
                slug: 'collided-org',
              },
            });
          }),
        },
        session: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
        organization: {
          create: jest
            .fn()
            .mockRejectedValue(new Error('Unique constraint failed')),
        },
      };

      const service = new WorkspaceService({
        client,
      } as unknown as PrismaService);

      const result = await service.ensureDefaultWorkspace(
        userId,
        'Racer',
        'racer@example.com',
      );

      expect(result.id).toBe('collided-org-id');
      expect(result.name).toBe('Collided Org');
    });
  });
});
