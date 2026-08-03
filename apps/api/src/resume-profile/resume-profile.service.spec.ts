import type { CareerProfileService } from '../career-profile/career-profile.service';
import type { MasterCareerProfile } from '../career-profile/career-profile.types';
import type { ResumeProfileRepository } from './resume-profile.repository';
import {
  ResumeProfileService,
  ResumeProfileValidationError,
} from './resume-profile.service';
import type {
  ResumeProfile,
  ResumeProfileInput,
  ResumeVersion,
} from './resume-profile.types';

const workspaceA = '8d7825b3-a7a0-4f40-9d7f-861cb69e4d3d';
const workspaceB = 'cd3b996e-5c03-4fe4-9dc8-60726ea7832d';
const projectId = 'ed0e1c6a-fd18-4679-9c4b-7d9383010e26';
const skillId = 'fa6fb4a6-15dc-4884-811f-a642a6bd5ed8';

const profileInput: ResumeProfileInput = {
  name: '  Software Engineering  ',
  roleFocus: 'Backend systems',
  visibleSections: ['experience', 'projects', 'skills'],
  sectionOrder: ['projects', 'experience', 'skills'],
  priorityProjectIds: [projectId],
  prioritySkillIds: [skillId],
  highlightRules: [{ recordId: projectId, emphasis: 'primary' }],
};

const masterProfile: MasterCareerProfile = {
  id: '11111111-1111-4111-8111-111111111111',
  workspaceId: workspaceA,
  version: 1,
  createdAt: '2026-07-23T00:00:00.000Z',
  updatedAt: '2026-07-23T00:00:00.000Z',
  identity: { fullName: 'Example Candidate' },
  education: [],
  experiences: [],
  projects: [
    {
      id: projectId,
      name: 'API Platform',
      technologies: ['TypeScript'],
    },
  ],
  achievements: [],
  skills: [{ id: skillId, name: 'TypeScript', proficiency: 'advanced' }],
  technologies: [],
  publications: [],
  hackathons: [],
  certifications: [],
  links: [],
};

class InMemoryResumeProfileRepository implements ResumeProfileRepository {
  private readonly profiles = new Map<string, ResumeProfile>();
  private readonly versions = new Map<string, ResumeVersion[]>();

  listByWorkspace(workspaceId: string): Promise<ResumeProfile[]> {
    const profiles = [...this.profiles.values()].filter(
      (profile) => profile.workspaceId === workspaceId,
    );

    return Promise.resolve(profiles.map((profile) => structuredClone(profile)));
  }

  findById(
    workspaceId: string,
    profileId: string,
  ): Promise<ResumeProfile | undefined> {
    const profile = this.profiles.get(profileId);

    if (profile?.workspaceId !== workspaceId) {
      return Promise.resolve(undefined);
    }

    return Promise.resolve(structuredClone(profile));
  }

  create(profile: ResumeProfile): Promise<ResumeProfile> {
    this.profiles.set(profile.id, structuredClone(profile));

    return Promise.resolve(structuredClone(profile));
  }

  update(profile: ResumeProfile): Promise<ResumeProfile> {
    const updatedProfile = { 
      ...profile, 
      updatedAt: new Date(Date.now() + 1000).toISOString()
    }
  };
    this.profiles.set(profile.id, structuredClone(updatedProfile));

    return Promise.resolve(structuredClone(updatedProfile));
  }

  delete(workspaceId: string, profileId: string): Promise<void> {
    const profile = this.profiles.get(profileId);

    if (profile?.workspaceId === workspaceId) {
      this.profiles.delete(profileId);
      this.versions.delete(profileId);
    }

    return Promise.resolve();
  }

  listVersions(
    workspaceId: string,
    profileId: string,
  ): Promise<ResumeVersion[]> {
    const profile = this.profiles.get(profileId);

    if (profile?.workspaceId !== workspaceId) {
      return Promise.resolve([]);
    }

    return Promise.resolve(
      (this.versions.get(profileId) ?? []).map((version) =>
        structuredClone(version),
      ),
    );
  }

  findVersionById(
    workspaceId: string,
    profileId: string,
    versionId: string,
  ): Promise<ResumeVersion | undefined> {
    const version = (this.versions.get(profileId) ?? []).find(
      (entry) => entry.id === versionId && entry.workspaceId === workspaceId,
    );

    return Promise.resolve(version ? structuredClone(version) : undefined);
  }

  createVersion(version: ResumeVersion): Promise<ResumeVersion> {
    const existingVersions = this.versions.get(version.resumeProfileId) ?? [];
    existingVersions.push(structuredClone(version));
    this.versions.set(version.resumeProfileId, existingVersions);

    return Promise.resolve(structuredClone(version));
  }
}

function createCareerProfileServiceStub(
  profiles: Record<string, MasterCareerProfile | undefined>,
): CareerProfileService {
  return {
    findByWorkspace: (workspaceId: string) =>
      Promise.resolve(profiles[workspaceId]),
  } as CareerProfileService;
}

describe('ResumeProfileService', () => {
  let repository: InMemoryResumeProfileRepository;
  let service: ResumeProfileService;

  beforeEach(() => {
    repository = new InMemoryResumeProfileRepository();
    service = new ResumeProfileService(
      repository,
      createCareerProfileServiceStub({ [workspaceA]: masterProfile }),
    );
  });

  it('creates a normalized resume profile without mutating input', async () => {
    const savedProfile = await service.create(workspaceA, profileInput);

    profileInput.name = 'Mutated input';

    expect(savedProfile.workspaceId).toBe(workspaceA);
    expect(savedProfile.name).toBe('Software Engineering');
    expect(savedProfile.visibleSections).toEqual([
      'experience',
      'projects',
      'skills',
    ]);
    expect(savedProfile.priorityProjectIds).toEqual([projectId]);
    await expect(service.listByWorkspace(workspaceA)).resolves.toHaveLength(1);
  });

  it('updates a resume profile and isolates profiles by workspace', async () => {
    const createdProfile = await service.create(workspaceA, profileInput);
    const updatedProfile = await service.update(workspaceA, createdProfile.id, {
      ...profileInput,
      name: 'Data Engineering',
    });

    await service.create(workspaceB, {
      name: 'General SDE',
      visibleSections: ['experience'],
    });

    expect(updatedProfile.name).toBe('Data Engineering');
    expect(updatedProfile.updatedAt).not.toBe(createdProfile.updatedAt);
    await expect(service.listByWorkspace(workspaceA)).resolves.toHaveLength(1);
    await expect(service.listByWorkspace(workspaceB)).resolves.toHaveLength(1);
  });

  it('creates an immutable resume version with a master profile snapshot', async () => {
    const createdProfile = await service.create(workspaceA, profileInput);
    const version = await service.createVersion(workspaceA, createdProfile.id, {
      targetCompany: 'Example Corp',
      targetRole: 'Backend Engineer',
      outputFormat: 'html',
    });

    masterProfile.identity.fullName = 'Mutated master profile';

    expect(version.masterProfileSnapshot.identity.fullName).toBe(
      'Example Candidate',
    );
    expect(version.selectedRecordIds.projectIds).toEqual([projectId]);
    expect(version.outputFormat).toBe('html');
    await expect(
      service.listVersions(workspaceA, createdProfile.id),
    ).resolves.toHaveLength(1);
  });

  it('rejects priority IDs that are not in the master career profile', async () => {
    const createdProfile = await service.create(workspaceA, profileInput);

    await expect(
      service.update(workspaceA, createdProfile.id, {
        ...profileInput,
        priorityProjectIds: ['99999999-9999-4999-8999-999999999999'],
      }),
    ).rejects.toBeInstanceOf(ResumeProfileValidationError);

    await expect(
      service.createVersion(workspaceA, createdProfile.id, {}),
    ).resolves.toBeDefined();
  });

  it('requires a master career profile before creating a version', async () => {
    const emptyWorkspaceService = new ResumeProfileService(
      repository,
      createCareerProfileServiceStub({}),
    );
    const createdProfile = await emptyWorkspaceService.create(workspaceA, {
      name: 'Software Engineering',
    });

    await expect(
      emptyWorkspaceService.createVersion(workspaceA, createdProfile.id, {}),
    ).rejects.toBeInstanceOf(ResumeProfileValidationError);
  });
});
