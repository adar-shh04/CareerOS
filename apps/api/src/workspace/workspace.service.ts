import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { CompleteOnboardingDto } from './workspace.dto';

@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  async completeOnboarding(
    userId: string,
    workspaceId: string,
    dto: CompleteOnboardingDto,
  ) {
    const membership = await this.prisma.client.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
      include: { workspace: true },
    });

    if (!membership) {
      throw new NotFoundException('Workspace not found.');
    }

    const [user, workspace] = await this.prisma.client.$transaction([
      this.prisma.client.user.update({
        where: { id: userId },
        data: { name: dto.name },
      }),
      this.prisma.client.workspace.update({
        where: { id: workspaceId },
        data: { name: dto.workspaceName },
      }),
    ]);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
      },
      needsOnboarding: false,
    };
  }

  async getWorkspace(workspaceId: string, userId: string) {
    const membership = await this.prisma.client.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
      include: { workspace: true },
    });

    if (!membership) {
      throw new NotFoundException('Workspace not found.');
    }

    return {
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      role: membership.role,
    };
  }
}
