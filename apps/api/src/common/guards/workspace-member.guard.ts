import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../../auth/auth.types';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      params?: { workspaceId?: string };
    }>();

    const user = request.user;
    let workspaceId = request.params?.workspaceId;

    if (!user) {
      throw new ForbiddenException('Workspace access denied.');
    }

    if (!workspaceId || workspaceId === 'current') {
      workspaceId = user.workspaceId;
      if (request.params) {
        request.params.workspaceId = user.workspaceId;
      }
    }

    if (!workspaceId) {
      throw new ForbiddenException('Workspace access denied.');
    }

    const membership = await this.prisma.client.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: workspaceId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this workspace.');
    }

    return true;
  }
}
