import { Injectable, NotFoundException } from '@nestjs/common';
import { generateLatexFromProfile } from '@repo/types';

import { PrismaService } from '../database/prisma.service';
import { Prisma, PrismaClient } from '../generated/prisma/client';
import { CompleteOnboardingDto } from './workspace.dto';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export interface DefaultWorkspaceResult {
  id: string;
  name: string;
  slug: string;
}

export async function ensureDefaultWorkspaceForUser(
  prismaClient: PrismaClient,
  userId: string,
  userName?: string | null,
  email?: string | null,
): Promise<DefaultWorkspaceResult> {
  const existingMembership = await prismaClient.member.findFirst({
    where: { userId },
    include: { organization: true },
    orderBy: { createdAt: 'asc' },
  });

  if (existingMembership?.organization) {
    await prismaClient.session
      .updateMany({
        where: { userId, activeOrganizationId: null },
        data: { activeOrganizationId: existingMembership.organizationId },
      })
      .catch(() => undefined);

    return {
      id: existingMembership.organization.id,
      name: existingMembership.organization.name,
      slug: existingMembership.organization.slug,
    };
  }

  const workspaceName = userName
    ? `${userName}'s Workspace`
    : 'My Career Workspace';
  const baseSlug = userName ?? email?.split('@')[0] ?? 'workspace';
  const slug = `${slugify(baseSlug)}-${Date.now().toString(36)}`;

  try {
    const org = await prismaClient.organization.create({
      data: {
        name: workspaceName,
        slug,
        members: {
          create: {
            userId,
            role: 'owner',
          },
        },
      },
    });

    await prismaClient.session
      .updateMany({
        where: { userId },
        data: { activeOrganizationId: org.id },
      })
      .catch(() => undefined);

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
    };
  } catch (error: unknown) {
    const fallbackMembership = await prismaClient.member.findFirst({
      where: { userId },
      include: { organization: true },
      orderBy: { createdAt: 'asc' },
    });

    if (fallbackMembership?.organization) {
      await prismaClient.session
        .updateMany({
          where: { userId, activeOrganizationId: null },
          data: { activeOrganizationId: fallbackMembership.organizationId },
        })
        .catch(() => undefined);

      return {
        id: fallbackMembership.organization.id,
        name: fallbackMembership.organization.name,
        slug: fallbackMembership.organization.slug,
      };
    }

    throw error;
  }
}

@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDefaultWorkspace(
    userId: string,
    userName?: string | null,
    email?: string | null,
  ): Promise<DefaultWorkspaceResult> {
    return ensureDefaultWorkspaceForUser(
      this.prisma.client,
      userId,
      userName,
      email,
    );
  }

  async completeOnboarding(
    userId: string,
    workspaceId: string | null,
    dto: CompleteOnboardingDto,
  ) {
    const membership = workspaceId
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

    const onboardingMetadata = {
      field: dto.field ?? 'General',
      careerDirection: dto.careerDirection ?? dto.targetRole,
      targetRole: dto.targetRole ?? 'Professional',
      experienceLevel: dto.experienceLevel ?? 'mid',
      locationPreference: dto.locationPreference,
      workArrangement: dto.workArrangement ?? 'any',
      skills: dto.skills ?? [],
      jobSearchPreferences: dto.jobSearchPreferences ?? {},
      completedAt: new Date().toISOString(),
    };
    const metadataString = JSON.stringify(onboardingMetadata);

    let organizationId: string;

    if (!membership) {
      const defaultOrg = await this.ensureDefaultWorkspace(userId, dto.name);
      organizationId = defaultOrg.id;

      await this.prisma.client.$transaction([
        this.prisma.client.user.update({
          where: { id: userId },
          data: { name: dto.name },
        }),
        this.prisma.client.organization.update({
          where: { id: organizationId },
          data: {
            name: dto.workspaceName || defaultOrg.name,
            metadata: metadataString,
          },
        }),
      ]);

      await this.prisma.client.session
        .updateMany({
          where: { userId },
          data: { activeOrganizationId: organizationId },
        })
        .catch(() => undefined);
    } else {
      organizationId = membership.organizationId;

      await this.prisma.client.$transaction([
        this.prisma.client.user.update({
          where: { id: userId },
          data: { name: dto.name },
        }),
        this.prisma.client.organization.update({
          where: { id: membership.organizationId },
          data: {
            name: dto.workspaceName,
            metadata: metadataString,
          },
        }),
      ]);

      await this.prisma.client.session
        .updateMany({
          where: { userId },
          data: { activeOrganizationId: organizationId },
        })
        .catch(() => undefined);
    }

    // Seed Master Career Profile if not yet created
    const existingMaster =
      await this.prisma.client.masterCareerProfile.findUnique({
        where: { organizationId },
      });

    if (!existingMaster) {
      await this.prisma.client.masterCareerProfile
        .create({
          data: {
            organizationId,
            fullName: dto.name,
            headline: dto.targetRole
              ? `${dto.targetRole}${dto.field ? ` · ${dto.field}` : ''}`
              : undefined,
            location: dto.locationPreference,
            skills: dto.skills?.length
              ? {
                  create: dto.skills.map((skillName) => ({
                    name: skillName,
                    proficiency: 'intermediate',
                  })),
                }
              : undefined,
          },
        })
        .catch((error: unknown) => {
          // A concurrent onboarding request already created it (unique per
          // workspace) — the profile exists, which is all this step needs.
          if (
            !(
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === 'P2002'
            )
          ) {
            throw error;
          }
        });
    }

    // Seed initial Resume Profile for this target role if not yet created
    const existingResume = await this.prisma.client.resumeProfile.findFirst({
      where: { organizationId },
    });

    if (!existingResume) {
      const defaultLatex = generateLatexFromProfile({
        id: '',
        workspaceId: organizationId,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        identity: {
          fullName: dto.name,
          headline: dto.targetRole
            ? `${dto.targetRole}${dto.field ? ` · ${dto.field}` : ''}`
            : undefined,
          location: dto.locationPreference,
        },
        education: [],
        experiences: [],
        projects: [],
        achievements: [],
        skills: (dto.skills ?? []).map((s) => ({ id: '', name: s })),
        technologies: [],
        publications: [],
        hackathons: [],
        certifications: [],
        links: [],
      });

      await this.prisma.client.resumeProfile.create({
        data: {
          organizationId,
          name: `${dto.targetRole ?? 'Primary'} Resume Profile`,
          roleFocus: dto.targetRole ?? 'General',
          styleSettings: { latexSource: defaultLatex },
        },
      });
    }

    const [updatedUser, updatedOrg] = await Promise.all([
      this.prisma.client.user.findUniqueOrThrow({ where: { id: userId } }),
      this.prisma.client.organization.findUniqueOrThrow({
        where: { id: organizationId },
      }),
    ]);

    return {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        avatar: updatedUser.avatar,
      },
      workspace: {
        id: updatedOrg.id,
        name: updatedOrg.name,
        slug: updatedOrg.slug,
      },
      needsOnboarding: false,
    };
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
