import type { CareerProfileRepository } from './career-profile.repository';
import {
  CareerProfileService,
  CareerProfileValidationError,
} from './career-profile.service';
import type {
  MasterCareerProfile,
  MasterCareerProfileInput,
} from './career-profile.types';

const workspaceA = '8d7825b3-a7a0-4f40-9d7f-861cb69e4d3d';
const workspaceB = 'cd3b996e-5c03-4fe4-9dc8-60726ea7832d';

const profileInput: MasterCareerProfileInput = {
  identity: {
    fullName: '  Example Candidate  ',
    headline: 'Backend engineer',
  },
  projects: [
    {
      id: 'ed0e1c6a-fd18-4679-9c4b-7d9383010e26',
      name: 'API Platform',
      technologies: ['TypeScript', 'NestJS'],
    },
  ],
  skills: [
    {
      id: 'fa6fb4a6-15dc-4884-811f-a642a6bd5ed8',
      name: 'TypeScript',
      proficiency: 'advanced',
    },
  ],
};

class InMemoryCareerProfileRepository implements CareerProfileRepository {
  private readonly profiles = new Map<string, MasterCareerProfile>();

  findByWorkspace(
    workspaceId: string,
  ): Promise<MasterCareerProfile | undefined> {
    const profile = this.profiles.get(workspaceId);

    return Promise.resolve(profile ? structuredClone(profile) : undefined);
  }

  save(profile: MasterCareerProfile): Promise<MasterCareerProfile> {
    this.profiles.set(profile.workspaceId, structuredClone(profile));

    return Promise.resolve(structuredClone(profile));
  }
}

describe('CareerProfileService', () => {
  let service: CareerProfileService;

  beforeEach(() => {
    service = new CareerProfileService(new InMemoryCareerProfileRepository());
  });

  it('creates a normalized, complete master profile without mutating input', async () => {
    const savedProfile = await service.save(workspaceA, profileInput);

    profileInput.identity.fullName = 'Mutated input';
    profileInput.projects?.[0]?.technologies?.push('PostgreSQL');

    expect(savedProfile.workspaceId).toBe(workspaceA);
    expect(savedProfile.version).toBe(1);
    expect(savedProfile.identity.fullName).toBe('Example Candidate');
    expect(savedProfile.education).toEqual([]);
    expect(savedProfile.projects[0]?.technologies).toEqual([
      'TypeScript',
      'NestJS',
    ]);
    await expect(service.findByWorkspace(workspaceA)).resolves.toEqual(
      savedProfile,
    );
  });

  it('versions updates and isolates profiles by workspace', async () => {
    const firstVersion = await service.save(workspaceA, profileInput);
    const secondVersion = await service.save(workspaceA, {
      ...profileInput,
      identity: { fullName: 'Example Candidate' },
    });
    const separateProfile = await service.save(workspaceB, {
      identity: { fullName: 'Another Candidate' },
    });

    expect(secondVersion.id).toBe(firstVersion.id);
    expect(secondVersion.version).toBe(2);
    expect(separateProfile.workspaceId).toBe(workspaceB);
    await expect(service.findByWorkspace(workspaceA)).resolves.toMatchObject({
      identity: { fullName: 'Example Candidate' },
    });
  });

  it('rejects an empty identity, invalid workspace ID, and invalid record ID', async () => {
    await expect(
      service.save(workspaceA, { identity: { fullName: '   ' } }),
    ).rejects.toThrow(CareerProfileValidationError);
    await expect(
      service.save('workspace-a', { identity: { fullName: 'Candidate' } }),
    ).rejects.toThrow('workspaceId must be a UUID.');
    await expect(
      service.save(workspaceA, {
        identity: { fullName: 'Candidate' },
        skills: [{ id: 'skill-typescript', name: 'TypeScript' }],
      }),
    ).rejects.toThrow('Career profile record IDs must be UUIDs.');
  });
});
