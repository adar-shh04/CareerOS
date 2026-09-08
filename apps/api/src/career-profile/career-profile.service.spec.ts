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

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  it('preserves valid existing UUIDs and generates valid UUIDs for records missing IDs', async () => {
    const existingId = 'ed0e1c6a-fd18-4679-9c4b-7d9383010e26';
    const saved = await service.save(workspaceA, {
      identity: { fullName: 'Jane Doe' },
      education: [
        // Missing ID genuinely
        {
          institution: 'Stanford University',
          degree: 'B.S. CS',
        } as unknown as NonNullable<
          MasterCareerProfileInput['education']
        >[number],
      ],
      experiences: [
        // Existing valid UUID
        {
          id: existingId,
          company: 'Acme Corp',
          title: 'Senior Engineer',
        },
      ],
      skills: [
        // Empty string ID treated as missing ID -> auto-generates
        { id: '', name: 'React' },
        // Existing valid UUID
        { id: 'fa6fb4a6-15dc-4884-811f-a642a6bd5ed8', name: 'TypeScript' },
      ],
      certifications: [
        { name: 'AWS Certified' } as unknown as NonNullable<
          MasterCareerProfileInput['certifications']
        >[number],
      ],
    });

    // Existing UUID was strictly preserved
    expect(saved.experiences[0]?.id).toBe(existingId);
    expect(saved.skills[1]?.id).toBe('fa6fb4a6-15dc-4884-811f-a642a6bd5ed8');

    // Missing IDs were generated with valid UUIDs
    expect(saved.education[0]?.id).toMatch(uuidRegex);
    expect(saved.skills[0]?.id).toMatch(uuidRegex);
    expect(saved.certifications[0]?.id).toMatch(uuidRegex);

    // Persistence and reload check
    const reloaded = await service.findByWorkspace(workspaceA);
    expect(reloaded).toEqual(saved);
  });

  it('sanitizes temporary or non-UUID record IDs to valid canonical UUIDs', async () => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const saved = await service.save(workspaceA, {
      identity: { fullName: 'Candidate' },
      skills: [{ id: 'skill-typescript', name: 'TypeScript' }],
      projects: [{ id: '12345', name: 'Project X' }],
    });

    expect(saved.skills[0]?.id).toMatch(uuidRegex);
    expect(saved.skills[0]?.id).not.toBe('skill-typescript');
    expect(saved.projects[0]?.id).toMatch(uuidRegex);
    expect(saved.projects[0]?.id).not.toBe('12345');
  });

  it('handles multiple nested career-profile records across all collections and persists/reloads', async () => {
    const complexProfile = {
      identity: { fullName: 'Dr. Alice Smith', location: 'London' },
      education: [{ institution: 'Oxford', degree: 'DPhil' }],
      experiences: [{ company: 'NHS', title: 'Consultant' }],
      projects: [{ name: 'Clinical Study', bullets: ['Published paper'] }],
      achievements: [{ title: 'Best Research Award 2024' }],
      skills: [{ name: 'Clinical Trial Management' }],
      technologies: [{ name: 'Epic EHR' }],
      publications: [{ title: 'Cardiology Advances', publisher: 'The Lancet' }],
      hackathons: [{ name: 'HealthHack', achievement: '1st Place' }],
      certifications: [{ name: 'Board Certified' }],
      links: [{ label: 'ORCID', url: 'https://orcid.org/0000' }],
    } as unknown as MasterCareerProfileInput;

    const saved = await service.save(workspaceA, complexProfile);

    expect(saved.education).toHaveLength(1);
    expect(saved.experiences).toHaveLength(1);
    expect(saved.projects).toHaveLength(1);
    expect(saved.achievements).toHaveLength(1);
    expect(saved.skills).toHaveLength(1);
    expect(saved.technologies).toHaveLength(1);
    expect(saved.publications).toHaveLength(1);
    expect(saved.hackathons).toHaveLength(1);
    expect(saved.certifications).toHaveLength(1);
    expect(saved.links).toHaveLength(1);

    // Check every collection entry has a valid UUID
    const allIds = [
      saved.education[0]?.id,
      saved.experiences[0]?.id,
      saved.projects[0]?.id,
      saved.achievements[0]?.id,
      saved.skills[0]?.id,
      saved.technologies[0]?.id,
      saved.publications[0]?.id,
      saved.hackathons[0]?.id,
      saved.certifications[0]?.id,
      saved.links[0]?.id,
    ];
    for (const id of allIds) {
      expect(id).toBeDefined();
      expect(id).toMatch(uuidRegex);
    }

    const reloaded = await service.findByWorkspace(workspaceA);
    expect(reloaded).toEqual(saved);
  });

  it('rejects an empty identity and invalid workspace ID', async () => {
    await expect(
      service.save(workspaceA, { identity: { fullName: '   ' } }),
    ).rejects.toThrow(CareerProfileValidationError);
    await expect(
      service.save('workspace-a', { identity: { fullName: 'Candidate' } }),
    ).rejects.toThrow('workspaceId must be a UUID.');
  });
});
