import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import type { AuthenticatedUser } from '../../auth/auth.types';
import { auth } from '../../auth/better-auth.instance';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class BetterAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // Explicitly construct Web Headers from Express request headers to ensure
    // reliable cookie and bearer token resolution across Node / Express versions.
    const headers = new Headers();
    if (request.headers.cookie) {
      headers.set('cookie', request.headers.cookie);
    }
    if (request.headers.authorization) {
      headers.set('authorization', request.headers.authorization);
    }

    // Better Auth reads the session cookie or bearer token straight off headers.
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      throw new UnauthorizedException('Authentication required.');
    }

    const organizations = await auth.api.listOrganizations({ headers });

    const activeOrganizationId =
      session.session.activeOrganizationId ?? organizations[0]?.id;

    // Narrow exception for the initial onboarding completion endpoint:
    // Only the workspace requirement is bypassed if the user does not have an org yet.
    // User authentication & identity verification remain strictly enforced above.
    const isOnboardingComplete =
      request.method === 'POST' &&
      (request.path === '/workspaces/onboarding/complete' ||
        request.url.includes('/workspaces/onboarding/complete'));

    if (!activeOrganizationId && !isOnboardingComplete) {
      throw new UnauthorizedException(
        'No active organization found for the user.',
      );
    }

    const user: AuthenticatedUser = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      workspaceId: activeOrganizationId ? activeOrganizationId : '',
    };

    (request as Request & { user: AuthenticatedUser }).user = user;

    return true;
  }
}
