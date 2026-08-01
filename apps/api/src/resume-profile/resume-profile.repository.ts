import type { ResumeProfile, ResumeVersion } from './resume-profile.types';

export const RESUME_PROFILE_REPOSITORY = Symbol('RESUME_PROFILE_REPOSITORY');

export interface ResumeProfileRepository {
  listByWorkspace(workspaceId: string): Promise<ResumeProfile[]>;
  findById(
    workspaceId: string,
    profileId: string,
  ): Promise<ResumeProfile | undefined>;
  create(profile: ResumeProfile): Promise<ResumeProfile>;
  update(profile: ResumeProfile): Promise<ResumeProfile>;
  delete(workspaceId: string, profileId: string): Promise<void>;
  listVersions(
    workspaceId: string,
    profileId: string,
  ): Promise<ResumeVersion[]>;
  findVersionById(
    workspaceId: string,
    profileId: string,
    versionId: string,
  ): Promise<ResumeVersion | undefined>;
  createVersion(version: ResumeVersion): Promise<ResumeVersion>;
}
