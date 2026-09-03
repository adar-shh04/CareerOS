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
import { PrismaService } from '../../database/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

@Injectable()
export class BetterAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

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

    let activeOrganizationId = session.session.activeOrganizationId;

    if (!activeOrganizationId) {
      try {
        const organizations = await auth.api.listOrganizations({ headers });
        activeOrganizationId = organizations[0]?.id ?? null;
      } catch {
        // Fall back to database query below
      }
    }

    // Fall back to direct Prisma membership check if session cache / Better Auth API is empty
    if (!activeOrganizationId) {
      const membership = await this.prisma.client.member.findFirst({
        where: { userId: session.user.id },
        include: { organization: true },
        orderBy: { createdAt: 'asc' },
      });

      if (membership) {
        activeOrganizationId = membership.organizationId;
        await this.prisma.client.session
          .updateMany({
            where: { userId: session.user.id },
            data: { activeOrganizationId: membership.organizationId },
          })
          .catch(() => undefined);
      }
    }

    const isOnboardingComplete =
      request.method === 'POST' &&
      (request.path === '/workspaces/onboarding/complete' ||
        request.url.includes('/workspaces/onboarding/complete'));

    // If the authenticated user has no workspace at all, auto-provision their initial personal workspace
    if (!activeOrganizationId && !isOnboardingComplete) {
      const workspaceName = session.user.name
        ? `${session.user.name}'s Workspace`
        : 'My Career Workspace';
      const slug = `${slugify(session.user.name || session.user.email.split('@')[0])}-${Date.now().toString(36)}`;

      const newOrg = await this.prisma.client.organization.create({
        data: {
          name: workspaceName,
          slug,
          members: {
            create: {
              userId: session.user.id,
              role: 'owner',
            },
          },
        },
      });

      activeOrganizationId = newOrg.id;
      await this.prisma.client.session
        .updateMany({
          where: { userId: session.user.id },
          data: { activeOrganizationId: newOrg.id },
        })
        .catch(() => undefined);
    }

    const user: AuthenticatedUser = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      workspaceId: activeOrganizationId ?? '',
    };

    (request as Request & { user: AuthenticatedUser }).user = user;

    return true;
  }
}
