import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import {
  CAREER_PROFILE_REPOSITORY,
  type CareerProfileRepository,
} from './career-profile.repository';
import {
  type CareerIdentity,
  type CareerRecord,
  type MasterCareerProfile,
  type MasterCareerProfileInput,
} from './career-profile.types';

export class CareerProfileValidationError extends Error {}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class CareerProfileService {
  constructor(
    @Inject(CAREER_PROFILE_REPOSITORY)
    private readonly careerProfileRepository: CareerProfileRepository,
  ) {}

  async findByWorkspace(
    workspaceId: string,
  ): Promise<MasterCareerProfile | undefined> {
    const profile = await this.careerProfileRepository.findByWorkspace(
      this.normalizeWorkspaceId(workspaceId),
    );

    return profile ? structuredClone(profile) : undefined;
  }

  async save(
    workspaceId: string,
    input: MasterCareerProfileInput,
  ): Promise<MasterCareerProfile> {
    const normalizedWorkspaceId = this.normalizeWorkspaceId(workspaceId);
    const normalizedInput = this.normalizeInput(input);
    const existingProfile = await this.careerProfileRepository.findByWorkspace(
      normalizedWorkspaceId,
    );
    const timestamp = new Date().toISOString();

    const profile: MasterCareerProfile = {
      id: existingProfile?.id ?? randomUUID(),
      workspaceId: normalizedWorkspaceId,
      version: (existingProfile?.version ?? 0) + 1,
      createdAt: existingProfile?.createdAt ?? timestamp,
      updatedAt: timestamp,
      ...normalizedInput,
    };

    return structuredClone(await this.careerProfileRepository.save(profile));
  }

  private normalizeWorkspaceId(workspaceId: string): string {
    const normalizedWorkspaceId = workspaceId.trim();

    if (!normalizedWorkspaceId) {
      throw new CareerProfileValidationError('workspaceId is required.');
    }

    if (!uuidPattern.test(normalizedWorkspaceId)) {
      throw new CareerProfileValidationError('workspaceId must be a UUID.');
    }

    return normalizedWorkspaceId;
  }

  private normalizeInput(
    input: MasterCareerProfileInput,
  ): Required<MasterCareerProfileInput> {
    const profile = structuredClone(input);
    const identity = this.normalizeIdentity(profile.identity);
    const collections = [
      profile.education,
      profile.experiences,
      profile.projects,
      profile.achievements,
      profile.skills,
      profile.technologies,
      profile.publications,
      profile.hackathons,
      profile.certifications,
      profile.links,
    ];

    if (
      collections.some(
        (collection) => collection !== undefined && !Array.isArray(collection),
      )
    ) {
      throw new CareerProfileValidationError(
        'Career profile collections must be arrays.',
      );
    }

    const normalizedProfile = {
      identity,
      education: this.normalizeCollection(profile.education),
      experiences: this.normalizeCollection(profile.experiences),
      projects: this.normalizeCollection(profile.projects),
      achievements: this.normalizeCollection(profile.achievements),
      skills: this.normalizeCollection(profile.skills),
      technologies: this.normalizeCollection(profile.technologies),
      publications: this.normalizeCollection(profile.publications),
      hackathons: this.normalizeCollection(profile.hackathons),
      certifications: this.normalizeCollection(profile.certifications),
      links: this.normalizeCollection(profile.links),
    };

    return normalizedProfile;
  }

  private normalizeCollection<T extends CareerRecord>(
    records: T[] | undefined,
  ): T[] {
    if (!records) return [];
    return records.map((record) => {
      const rawId = (record as { id?: string }).id;
      const id = typeof rawId === 'string' ? rawId.trim() : '';
      if (!id || !uuidPattern.test(id)) {
        return {
          ...record,
          id: randomUUID(),
        };
      }
      return {
        ...record,
        id,
      };
    });
  }

  private normalizeIdentity(identity: CareerIdentity): CareerIdentity {
    const fullName = identity.fullName.trim();

    if (!fullName) {
      throw new CareerProfileValidationError('identity.fullName is required.');
    }

    return {
      ...identity,
      fullName,
    };
  }
}
