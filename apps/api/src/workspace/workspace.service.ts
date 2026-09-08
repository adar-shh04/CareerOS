import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { generateCanonicalLatexTemplate } from '../resume-profile/latex-template.util';
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
      const slug = `${slugify(dto.workspaceName || 'My Career Workspace')}-${Date.now().toString(36)}`;
      const organization = await this.prisma.client.organization.create({
        data: {
          name: dto.workspaceName || 'My Career Workspace',
          slug,
          metadata: metadataString,
          members: {
            create: {
              userId,
              role: 'owner',
            },
          },
        },
      });

      organizationId = organization.id;

      await this.prisma.client.user.update({
        where: { id: userId },
        data: { name: dto.name },
      });

      await this.prisma.client.session
        .updateMany({
          where: { userId },
          data: { activeOrganizationId: organization.id },
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
      await this.prisma.client.masterCareerProfile.create({
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
      });
    }

    // Seed initial Resume Profile for this target role if not yet created
    const existingResume = await this.prisma.client.resumeProfile.findFirst({
      where: { organizationId },
    });

    if (!existingResume) {
      const defaultLatex = generateCanonicalLatexTemplate(undefined, {
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
