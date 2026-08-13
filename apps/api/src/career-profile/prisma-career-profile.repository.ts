import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import type { Prisma } from '../generated/prisma/client';
import type { CareerProfileRepository } from './career-profile.repository';
import type {
  CareerProfileSource,
  MasterCareerProfile,
} from './career-profile.types';

export class CareerProfileWorkspaceNotFoundError extends Error {}
export class CareerProfileConcurrencyError extends Error {}

const careerProfileInclude = {
  education: true,
  experiences: true,
  projects: true,
  achievements: true,
  skills: true,
  technologies: true,
  publications: true,
  hackathons: true,
  certifications: true,
  links: true,
} satisfies Prisma.MasterCareerProfileInclude;

type PersistedCareerProfile = Prisma.MasterCareerProfileGetPayload<{
  include: typeof careerProfileInclude;
}>;

@Injectable()
export class PrismaCareerProfileRepository implements CareerProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByWorkspace(
    workspaceId: string,
  ): Promise<MasterCareerProfile | undefined> {
    const profile = await this.prisma.client.masterCareerProfile.findUnique({
      where: { organizationId: workspaceId },
      include: careerProfileInclude,
    });

    return profile ? this.toDomain(profile) : undefined;
  }

  async save(profile: MasterCareerProfile): Promise<MasterCareerProfile> {
    return this.prisma.client.$transaction(async (transaction) => {
      const workspace = await transaction.organization.findUnique({
        where: { id: profile.workspaceId },
        select: { id: true },
      });

      if (!workspace) {
        throw new CareerProfileWorkspaceNotFoundError(
          'The workspace does not exist.',
        );
      }

      const existing = await transaction.masterCareerProfile.findUnique({
        where: { organizationId: profile.workspaceId },
        select: { id: true, version: true },
      });

      if (!existing) {
        const created = await transaction.masterCareerProfile.create({
          data: this.toCreateData(profile),
          include: careerProfileInclude,
        });

        return this.toDomain(created);
      }

      const updated = await transaction.masterCareerProfile.updateMany({
        where: {
          id: profile.id,
          organizationId: profile.workspaceId,
          version: profile.version - 1,
        },
        data: {
          fullName: profile.identity.fullName,
          headline: profile.identity.headline,
          location: profile.identity.location,
          email: profile.identity.email,
          version: profile.version,
          updatedAt: new Date(profile.updatedAt),
        },
      });

      if (updated.count !== 1) {
        throw new CareerProfileConcurrencyError(
          'The career profile was updated by another request. Refresh and try again.',
        );
      }

      await this.replaceCollections(transaction, existing.id, profile);

      const persisted = await transaction.masterCareerProfile.findUniqueOrThrow(
        {
          where: { id: profile.id },
          include: careerProfileInclude,
        },
      );

      return this.toDomain(persisted);
    });
  }

  private async replaceCollections(
    transaction: Prisma.TransactionClient,
    profileId: string,
    profile: MasterCareerProfile,
  ): Promise<void> {
    await transaction.educationEntry.deleteMany({ where: { profileId } });
    await transaction.experienceEntry.deleteMany({ where: { profileId } });
    await transaction.projectEntry.deleteMany({ where: { profileId } });
    await transaction.achievementEntry.deleteMany({ where: { profileId } });
    await transaction.skillEntry.deleteMany({ where: { profileId } });
    await transaction.technologyEntry.deleteMany({ where: { profileId } });
    await transaction.publicationEntry.deleteMany({ where: { profileId } });
    await transaction.hackathonEntry.deleteMany({ where: { profileId } });
    await transaction.certificationEntry.deleteMany({ where: { profileId } });
    await transaction.careerLink.deleteMany({ where: { profileId } });

    await transaction.educationEntry.createMany({
      data: profile.education.map((entry) => ({ ...entry, profileId })),
    });
    await transaction.experienceEntry.createMany({
      data: profile.experiences.map((entry) => ({ ...entry, profileId })),
    });
    await transaction.projectEntry.createMany({
      data: profile.projects.map((entry) => ({ ...entry, profileId })),
    });
    await transaction.achievementEntry.createMany({
      data: profile.achievements.map((entry) => ({ ...entry, profileId })),
    });
    await transaction.skillEntry.createMany({
      data: profile.skills.map((entry) => ({ ...entry, profileId })),
    });
    await transaction.technologyEntry.createMany({
      data: profile.technologies.map((entry) => ({ ...entry, profileId })),
    });
    await transaction.publicationEntry.createMany({
      data: profile.publications.map((entry) => ({ ...entry, profileId })),
    });
    await transaction.hackathonEntry.createMany({
      data: profile.hackathons.map((entry) => ({ ...entry, profileId })),
    });
    await transaction.certificationEntry.createMany({
      data: profile.certifications.map((entry) => ({ ...entry, profileId })),
    });
    await transaction.careerLink.createMany({
      data: profile.links.map((entry) => ({ ...entry, profileId })),
    });
  }

  private toCreateData(
    profile: MasterCareerProfile,
  ): Prisma.MasterCareerProfileCreateInput {
    return {
      id: profile.id,
      organization: { connect: { id: profile.workspaceId } },
      fullName: profile.identity.fullName,
      headline: profile.identity.headline,
      location: profile.identity.location,
      email: profile.identity.email,
      version: profile.version,
      createdAt: new Date(profile.createdAt),
      updatedAt: new Date(profile.updatedAt),
      education: { create: profile.education },
      experiences: { create: profile.experiences },
      projects: { create: profile.projects },
      achievements: { create: profile.achievements },
      skills: { create: profile.skills },
      technologies: { create: profile.technologies },
      publications: { create: profile.publications },
      hackathons: { create: profile.hackathons },
      certifications: { create: profile.certifications },
      links: { create: profile.links },
    };
  }

  private toDomain(profile: PersistedCareerProfile): MasterCareerProfile {
    return {
      id: profile.id,
      workspaceId: profile.organizationId,
      version: profile.version,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
      identity: {
        fullName: profile.fullName,
        headline: profile.headline ?? undefined,
        location: profile.location ?? undefined,
        email: profile.email ?? undefined,
      },
      education: profile.education.map((entry) => ({
        ...this.withSource(entry),
        institution: entry.institution,
        degree: entry.degree ?? undefined,
        fieldOfStudy: entry.fieldOfStudy ?? undefined,
        startDate: entry.startDate ?? undefined,
        endDate: entry.endDate ?? undefined,
        highlights: entry.highlights,
      })),
      experiences: profile.experiences.map((entry) => ({
        ...this.withSource(entry),
        company: entry.company,
        title: entry.title,
        location: entry.location ?? undefined,
        startDate: entry.startDate ?? undefined,
        endDate: entry.endDate ?? undefined,
        current: entry.current,
        bullets: entry.bullets,
        technologies: entry.technologies,
      })),
      projects: profile.projects.map((entry) => ({
        ...this.withSource(entry),
        name: entry.name,
        description: entry.description ?? undefined,
        url: entry.url ?? undefined,
        repositoryUrl: entry.repositoryUrl ?? undefined,
        bullets: entry.bullets,
        technologies: entry.technologies,
      })),
      achievements: profile.achievements.map((entry) => ({
        ...this.withSource(entry),
        title: entry.title,
        description: entry.description ?? undefined,
        date: entry.date ?? undefined,
      })),
      skills: profile.skills.map((entry) => ({
        ...this.withSource(entry),
        name: entry.name,
        category: entry.category ?? undefined,
        proficiency: entry.proficiency as
          | 'foundational'
          | 'working'
          | 'advanced'
          | 'expert'
          | undefined,
      })),
      technologies: profile.technologies.map((entry) => ({
        ...this.withSource(entry),
        name: entry.name,
        category: entry.category ?? undefined,
      })),
      publications: profile.publications.map((entry) => ({
        ...this.withSource(entry),
        title: entry.title,
        publisher: entry.publisher ?? undefined,
        date: entry.date ?? undefined,
        url: entry.url ?? undefined,
      })),
      hackathons: profile.hackathons.map((entry) => ({
        ...this.withSource(entry),
        name: entry.name,
        organizer: entry.organizer ?? undefined,
        date: entry.date ?? undefined,
        achievement: entry.achievement ?? undefined,
      })),
      certifications: profile.certifications.map((entry) => ({
        ...this.withSource(entry),
        name: entry.name,
        issuer: entry.issuer ?? undefined,
        issueDate: entry.issueDate ?? undefined,
        expirationDate: entry.expirationDate ?? undefined,
        credentialUrl: entry.credentialUrl ?? undefined,
      })),
      links: profile.links.map((entry) => ({
        ...this.withSource(entry),
        label: entry.label,
        url: entry.url,
      })),
    };
  }

  private withSource(entry: {
    id: string;
    source: string | null;
    sourceReference: string | null;
  }): { id: string; source?: CareerProfileSource; sourceReference?: string } {
    return {
      id: entry.id,
      source: entry.source as CareerProfileSource | undefined,
      sourceReference: entry.sourceReference ?? undefined,
    };
  }
}
