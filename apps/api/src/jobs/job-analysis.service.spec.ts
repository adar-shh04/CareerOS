import type { CanonicalJob } from '@repo/types';

import type { MasterCareerProfile } from '../career-profile/career-profile.types';
import { JobAnalysisService } from './job-analysis.service';
import { JobMatchingService } from './job-matching.service';

const baseJob = (overrides: Partial<CanonicalJob> = {}): CanonicalJob => ({
  id: 'job-100',
  source: 'manual',
  company: 'Linear',
  title: 'Senior Frontend Engineer',
  location: 'Remote',
  isRemote: true,
  remotePolicy: 'REMOTE',
  seniority: 'Senior',
  experienceRequirements: { minYears: 5, text: '5+ years' },
  isNormalized: true,
  requiredSkills: ['React', 'TypeScript', 'GraphQL'],
  preferredSkills: ['Next.js', 'Tailwind CSS'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const profile = (skills: string[], years = 5): MasterCareerProfile => ({
  id: 'prof-1',
  workspaceId: 'ws-1',
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  identity: { fullName: 'Jane Doe', headline: 'Full Stack Engineer' },
  experiences: [
    {
      id: 'exp-1',
      company: 'Acme Corp',
      title: 'Frontend Engineer',
      startDate: `${String(2024 - years)}-01`,
      endDate: '2024-01',
      bullets: ['Built React apps'],
    },
  ],
  education: [],
  projects: [],
  achievements: [],
  skills: skills.map((name, i) => ({ id: `sk-${String(i)}`, name })),
  technologies: [],
  publications: [],
  hackathons: [],
  certifications: [],
  links: [],
});

describe('JobAnalysisService (driven by the real matcher)', () => {
  const matcher = new JobMatchingService();
  const service = new JobAnalysisService();
  const analyze = (job: CanonicalJob, p: MasterCareerProfile) =>
    service.analyze(job, matcher.match({ job, masterProfile: p }));

  it('classifies required and preferred skills into matched and missing', () => {
    const analysis = analyze(
      baseJob(),
      profile(['React', 'TypeScript', 'Next.js']),
    );

    expect(analysis.skills.matchedSkills).toEqual(['react', 'typescript']);
    expect(analysis.skills.missingSkills).toEqual(['graphql']);
    expect(analysis.skills.matchedPreferredSkills).toEqual(['next.js']);
    expect(analysis.gaps.missingRequiredSkills).toEqual(['graphql']);
    expect(analysis.gaps.missingPreferredSkills).toEqual(['tailwind css']);
    expect(analysis.skills.skillMatchPercentage).toBe(67);
  });

  it('regression: a preferred skill the profile has is NOT reported missing', () => {
    // Previously missing preferred skills were computed against the REQUIRED
    // matches only, so every preferred skill showed as missing.
    const analysis = analyze(
      baseJob({ requiredSkills: ['React'], preferredSkills: ['GraphQL'] }),
      profile(['React', 'GraphQL']),
    );
    expect(analysis.skills.matchedPreferredSkills).toEqual(['graphql']);
    expect(analysis.gaps.missingPreferredSkills).toEqual([]);
  });

  it('uses canonical skill identity for preferred skills (aliases yes, substrings no)', () => {
    const analysis = analyze(
      baseJob({
        requiredSkills: ['Java'],
        preferredSkills: ['NodeJS', 'Go', 'JavaScript'],
      }),
      profile(['Java', 'Node.js', 'MongoDB']),
    );
    expect(analysis.skills.matchedSkills).toEqual(['java']);
    expect(analysis.skills.matchedPreferredSkills).toEqual(['nodejs']);
    expect(analysis.gaps.missingPreferredSkills).toEqual(['go', 'javascript']);
  });

  it('a preferred skill duplicated in required is evaluated once, as required', () => {
    const analysis = analyze(
      baseJob({ requiredSkills: ['React'], preferredSkills: ['react.js'] }),
      profile([]),
    );
    expect(analysis.gaps.missingRequiredSkills).toEqual(['react']);
    expect(analysis.gaps.missingPreferredSkills).toEqual([]);
  });

  it('recommends emphasizing only skills the profile actually has', () => {
    const analysis = analyze(baseJob(), profile(['React']));
    expect(analysis.targetingRecommendations.prioritySkillNames).toEqual([
      'react',
    ]);
    expect(analysis.targetingRecommendations.suggestedFocus).not.toMatch(
      /graphql|typescript/i,
    );
  });

  it('uses persisted seniority/experience and never defaults to "Mid" / 2 years', () => {
    const stated = analyze(baseJob(), profile(['React'], 3));
    expect(stated.seniority).toBe('Senior');
    expect(stated.senioritySource).toBe('normalized');
    expect(stated.gaps.seniorityAlignment).toBe('under_qualified');

    const unstated = analyze(
      baseJob({
        title: 'Frontend Engineer',
        seniority: undefined,
        experienceRequirements: undefined,
      }),
      profile(['React'], 3),
    );
    expect(unstated.seniority).toBe('Not specified');
    expect(unstated.senioritySource).toBe('unknown');
    expect(unstated.gaps.seniorityAlignment).toBe('unknown');
  });

  it('legacy (never normalized) jobs fall back to labelled title inference', () => {
    const legacy = analyze(
      baseJob({
        title: 'Staff Frontend Engineer',
        seniority: undefined,
        experienceRequirements: undefined,
        isNormalized: false,
      }),
      profile(['React']),
    );
    expect(legacy.seniority).toBe('Staff / Lead');
    expect(legacy.senioritySource).toBe('inferred_from_title');
  });
});
