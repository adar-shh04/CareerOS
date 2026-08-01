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

    // Better Auth reads the session cookie straight off the incoming
    // headers — no manual JWT verification, no refresh-token dance.
    const session = await auth.api.getSession({
      headers: new Headers(request.headers as Record<string, string>),
    });

    if (!session?.user) {
      throw new UnauthorizedException('Authentication required.');
    }

    const organizations = await auth.api.listOrganizations({
      headers: new Headers(request.headers as Record<string, string>),
    });

    const activeOrganizationId =
      session.session.activeOrganizationId ?? organizations[0]?.id;

    if (!activeOrganizationId) {
      throw new UnauthorizedException(
        'No active organization found for the user.',
      );
    }

    const user: AuthenticatedUser = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      workspaceId: activeOrganizationId,
    };

    // Same shape @CurrentUser() has always returned — nothing downstream
    // of the guard (career-profile, resume-profile, byok, workspace) needs
    // to change.
    (request as Request & { user: AuthenticatedUser }).user = user;

    return true;
  }
}
