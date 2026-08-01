import type { MasterCareerProfile } from './career-profile.types';

export const CAREER_PROFILE_REPOSITORY = Symbol('CAREER_PROFILE_REPOSITORY');

export interface CareerProfileRepository {
  findByWorkspace(
    workspaceId: string,
  ): Promise<MasterCareerProfile | undefined>;
  save(profile: MasterCareerProfile): Promise<MasterCareerProfile>;
}
