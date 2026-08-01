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
    const workspaceId = request.params?.workspaceId;

    if (!user || !workspaceId) {
      throw new ForbiddenException('Workspace access denied.');
    }

    const membership = await this.prisma.client.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this workspace.');
    }

    return true;
  }
}
