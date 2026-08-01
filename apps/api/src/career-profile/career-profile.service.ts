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
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
      education: profile.education ?? [],
      experiences: profile.experiences ?? [],
      projects: profile.projects ?? [],
      achievements: profile.achievements ?? [],
      skills: profile.skills ?? [],
      technologies: profile.technologies ?? [],
      publications: profile.publications ?? [],
      hackathons: profile.hackathons ?? [],
      certifications: profile.certifications ?? [],
      links: profile.links ?? [],
    };

    this.validateRecordIds([
      ...normalizedProfile.education,
      ...normalizedProfile.experiences,
      ...normalizedProfile.projects,
      ...normalizedProfile.achievements,
      ...normalizedProfile.skills,
      ...normalizedProfile.technologies,
      ...normalizedProfile.publications,
      ...normalizedProfile.hackathons,
      ...normalizedProfile.certifications,
      ...normalizedProfile.links,
    ]);

    return normalizedProfile;
  }

  private validateRecordIds(records: CareerRecord[]): void {
    if (records.some((record) => !uuidPattern.test(record.id))) {
      throw new CareerProfileValidationError(
        'Career profile record IDs must be UUIDs.',
      );
    }
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
