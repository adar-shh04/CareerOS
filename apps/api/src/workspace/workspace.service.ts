import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { CompleteOnboardingDto } from './workspace.dto';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  async completeOnboarding(
    userId: string,
    workspaceId: string | null,
    dto: CompleteOnboardingDto,
  ) {
    let membership = workspaceId
      ? await this.prisma.client.member.findUnique({
          where: {
            organizationId_userId: {
              organizationId: workspaceId,
              userId,
            },
          },
          include: { organization: true },
        })
      : await this.prisma.client.member.findFirst({
          where: { userId },
          include: { organization: true },
        });

    if (!membership) {
      const slug = `${slugify(dto.workspaceName || 'My Career Workspace')}-${Date.now().toString(36)}`;
      const organization = await this.prisma.client.organization.create({
        data: {
          name: dto.workspaceName || 'My Career Workspace',
          slug,
          members: {
            create: {
              userId,
              role: 'owner',
            },
          },
        },
      });

      const user = await this.prisma.client.user.update({
        where: { id: userId },
        data: { name: dto.name },
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
        workspace: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        },
        needsOnboarding: false,
      };
    } else {
      const [user, organization] = await this.prisma.client.$transaction([
        this.prisma.client.user.update({
          where: { id: userId },
          data: { name: dto.name },
        }),
        this.prisma.client.organization.update({
          where: { id: membership.organizationId },
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
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        },
        needsOnboarding: false,
      };
    }
  }

  async getWorkspace(workspaceId: string, userId: string) {
    const membership = await this.prisma.client.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: workspaceId,
          userId,
        },
      },
      include: { organization: true },
    });

    if (!membership) {
      throw new NotFoundException('Workspace not found.');
    }

    return {
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      role: membership.role,
    };
  }
}
