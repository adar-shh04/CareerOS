import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';

import type { PrismaService } from '../../database/prisma.service';
import { WorkspaceMemberGuard } from './workspace-member.guard';

describe('WorkspaceMemberGuard', () => {
  let guard: WorkspaceMemberGuard;
  let mockPrismaService: {
    client: {
      member: {
        findUnique: jest.Mock;
      };
    };
  };

  beforeEach(() => {
    mockPrismaService = {
      client: {
        member: {
          findUnique: jest.fn(),
        },
      },
    };
    guard = new WorkspaceMemberGuard(
      mockPrismaService as unknown as PrismaService,
    );
  });

  const createMockContext = (
    user?: { id: string; email: string },
    workspaceId?: string,
  ): ExecutionContext => {
    const request = {
      user,
      params: { workspaceId },
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  it('throws ForbiddenException when user is not present on request', async () => {
    const context = createMockContext(undefined, 'ws-123');
    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('Workspace access denied.'),
    );
  });

  it('throws ForbiddenException when workspaceId param is missing', async () => {
    const context = createMockContext(
      { id: 'u-1', email: 'u1@test.local' },
      undefined,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('Workspace access denied.'),
    );
  });

  it('throws ForbiddenException (403 cross-tenant) when user is not a member of the workspace', async () => {
    const context = createMockContext(
      { id: 'u-1', email: 'u1@test.local' },
      'ws-other',
    );
    mockPrismaService.client.member.findUnique.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('You do not have access to this workspace.'),
    );
    expect(mockPrismaService.client.member.findUnique).toHaveBeenCalledWith({
      where: {
        organizationId_userId: {
          organizationId: 'ws-other',
          userId: 'u-1',
        },
      },
    });
  });

  it('allows access when user is a member of the requested workspace', async () => {
    const context = createMockContext(
      { id: 'u-1', email: 'u1@test.local' },
      'ws-own',
    );
    mockPrismaService.client.member.findUnique.mockResolvedValue({
      id: 'm-1',
      organizationId: 'ws-own',
      userId: 'u-1',
      role: 'owner',
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });
});
