import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { auth } from '../../auth/better-auth.instance';
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

  beforeEach(() => {
    reflector = new Reflector();
    guard = new BetterAuthGuard(reflector);
    jest.clearAllMocks();
  });

  const createMockContext = (
    isPublic: boolean,
    headers: Record<string, string> = {},
  ): { context: ExecutionContext; request: Record<string, unknown> } => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(isPublic);

    const request: Record<string, unknown> = {
      headers,
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

  it('throws UnauthorizedException when session has no active organization and listOrganizations is empty', async () => {
    const { context } = createMockContext(false);
    (auth.api.getSession as unknown as jest.Mock).mockResolvedValue({
      user: { id: 'u1', email: 'user@test.local', name: 'User' },
      session: { id: 's1', activeOrganizationId: null },
    });
    (auth.api.listOrganizations as unknown as jest.Mock).mockResolvedValue([]);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('No active organization found for the user.'),
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

  it('falls back to the first organization when activeOrganizationId is absent', async () => {
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
});
