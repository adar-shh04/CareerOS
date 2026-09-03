import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { auth } from '../../auth/better-auth.instance';
import type { PrismaService } from '../../database/prisma.service';
import { BetterAuthGuard } from './better-auth.guard';

jest.mock('../../auth/better-auth.instance', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
      listOrganizations: jest.fn(),
    },
  },
}));

describe('BetterAuthGuard', () => {
  let guard: BetterAuthGuard;
  let reflector: Reflector;
  let mockPrisma: {
    client: {
      member: {
        findFirst: jest.Mock;
      };
      session: {
        updateMany: jest.Mock;
      };
      organization: {
        create: jest.Mock;
      };
    };
  };

  beforeEach(() => {
    reflector = new Reflector();
    mockPrisma = {
      client: {
        member: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
        session: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        organization: {
          create: jest.fn().mockResolvedValue({ id: 'org-auto' }),
        },
      },
    };
    guard = new BetterAuthGuard(
      reflector,
      mockPrisma as unknown as PrismaService,
    );
    jest.clearAllMocks();
  });

  const createMockContext = (
    isPublic: boolean,
    headers: Record<string, string> = {},
    path = '/workspaces/current/jobs',
  ): { context: ExecutionContext; request: Record<string, unknown> } => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(isPublic);

    const request: Record<string, unknown> = {
      headers,
      method: 'GET',
      path,
      url: path,
    };

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    return { context, request };
  };

  it('allows access to public routes without authentication', async () => {
    const { context } = createMockContext(true);
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(auth.api.getSession).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when no session exists', async () => {
    const { context } = createMockContext(false);
    (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('authenticates user and attaches workspaceId to request when activeOrganizationId is present', async () => {
    const { context, request } = createMockContext(false);
    (auth.api.getSession as unknown as jest.Mock).mockResolvedValue({
      user: { id: 'u1', email: 'user@test.local', name: 'User' },
      session: { id: 's1', activeOrganizationId: 'org-123' },
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(request.user).toEqual({
      id: 'u1',
      email: 'user@test.local',
      name: 'User',
      workspaceId: 'org-123',
    });
  });

  it('falls back to the first organization from listOrganizations when activeOrganizationId is absent', async () => {
    const { context, request } = createMockContext(false);
    (auth.api.getSession as unknown as jest.Mock).mockResolvedValue({
      user: { id: 'u1', email: 'user@test.local', name: 'User' },
      session: { id: 's1', activeOrganizationId: null },
    });
    (auth.api.listOrganizations as unknown as jest.Mock).mockResolvedValue([
      { id: 'org-fallback', name: 'Fallback Org' },
    ]);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(request.user).toEqual({
      id: 'u1',
      email: 'user@test.local',
      name: 'User',
      workspaceId: 'org-fallback',
    });
  });

  it('falls back to Prisma member organization when Better Auth API has no active organization', async () => {
    const { context, request } = createMockContext(false);
    (auth.api.getSession as unknown as jest.Mock).mockResolvedValue({
      user: { id: 'u1', email: 'user@test.local', name: 'User' },
      session: { id: 's1', activeOrganizationId: null },
    });
    (auth.api.listOrganizations as unknown as jest.Mock).mockResolvedValue([]);
    mockPrisma.client.member.findFirst.mockResolvedValue({
      organizationId: 'org-prisma',
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(request.user).toEqual({
      id: 'u1',
      email: 'user@test.local',
      name: 'User',
      workspaceId: 'org-prisma',
    });
  });

  it('auto-provisions personal workspace when user has zero organizations', async () => {
    const { context, request } = createMockContext(false);
    (auth.api.getSession as unknown as jest.Mock).mockResolvedValue({
      user: { id: 'u1', email: 'user@test.local', name: 'User' },
      session: { id: 's1', activeOrganizationId: null },
    });
    (auth.api.listOrganizations as unknown as jest.Mock).mockResolvedValue([]);
    mockPrisma.client.member.findFirst.mockResolvedValue(null);
    mockPrisma.client.organization.create.mockResolvedValue({ id: 'org-auto' });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockPrisma.client.organization.create).toHaveBeenCalled();
    expect(request.user).toEqual({
      id: 'u1',
      email: 'user@test.local',
      name: 'User',
      workspaceId: 'org-auto',
    });
  });
});
