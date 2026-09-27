import { JobNormalizationService } from './ingestion/job-normalization.service';
import {
  isMatchFresh,
  MATCHER_VERSION,
  type MatchSource,
  weightsKey,
} from './match-freshness';
import {
  buildNormalizedMetadata,
  parseNormalizedMetadata,
} from './normalized-metadata';
import {
  classifySeniorityFromTitle,
  resolveJobRequirements,
} from './seniority';

describe('seniority classification (title only, whole words)', () => {
  it.each([
    ['Principal Engineer', 'Principal'],
    ['Staff Software Engineer', 'Staff / Lead'],
    ['Tech Lead, Payments', 'Staff / Lead'],
    ['Senior Data Analyst', 'Senior'],
    ['Sr. Backend Engineer', 'Senior'],
    ['Junior Designer', 'Junior / Entry'],
    ['Engineering Manager', 'Management'],
    ['Software Engineer II', 'Mid'],
    ['Mid-level Product Designer', 'Mid'],
  ])('%p → %p', (title, expected) => {
    expect(classifySeniorityFromTitle(title)).toBe(expected);
  });

  it.each([
    'Software Engineer',
    'Registered Nurse',
    'Headquarters Operations Analyst', // "head" inside a word
    'MVP Product Builder', // "vp" inside a word
    'Leading-edge Platform Engineer', // "lead" inside a word
    'Seniority Programs Coordinator', // "senior" inside a word
  ])('%p has no seniority signal (not defaulted)', (title) => {
    expect(classifySeniorityFromTitle(title)).toBeUndefined();
  });
});

describe('resolveJobRequirements', () => {
  it('uses persisted normalized values as authoritative', () => {
    expect(
      resolveJobRequirements({
        title: 'Junior Engineer', // ignored: normalized value wins
        seniority: 'Senior',
        experienceRequirements: { minYears: 5 },
        isNormalized: true,
      }),
    ).toEqual({
      seniority: 'Senior',
      senioritySource: 'normalized',
      requiredYears: 5,
      requiredYearsSource: 'normalized',
    });
  });

  it('never infers anything for a normalized job that stated nothing', () => {
    expect(
      resolveJobRequirements({ title: 'Senior Engineer', isNormalized: true }),
    ).toEqual({
      seniority: undefined,
      senioritySource: 'unknown',
      requiredYearsSource: 'unknown',
    });
  });

  it('labels the title fallback for legacy (never normalized) jobs; never infers years', () => {
    expect(resolveJobRequirements({ title: 'Senior Engineer' })).toEqual({
      seniority: 'Senior',
      senioritySource: 'inferred_from_title',
      requiredYearsSource: 'unknown',
    });
  });
});

describe('normalized metadata persistence format', () => {
  it('round-trips seniority and experience', () => {
    const stored = buildNormalizedMetadata({
      seniority: 'Senior',
      experienceRequirements: { minYears: 3, maxYears: 5, text: '3-5 years' },
    });
    expect(parseNormalizedMetadata(JSON.parse(JSON.stringify(stored)))).toEqual(
      stored,
    );
  });

  it('distinguishes "normalized, nothing stated" from legacy NULL', () => {
    expect(parseNormalizedMetadata(buildNormalizedMetadata({}))).toEqual({
      schemaVersion: 1,
      seniority: null,
      experienceRequirements: null,
    });
    expect(parseNormalizedMetadata(null)).toBeNull();
  });

  it('rejects malformed stored values instead of trusting them', () => {
    expect(parseNormalizedMetadata({ schemaVersion: 2 })).toBeNull();
    expect(
      parseNormalizedMetadata({
        schemaVersion: 1,
        seniority: 'Wizard',
        experienceRequirements: { minYears: -3 },
      }),
    ).toEqual({
      schemaVersion: 1,
      seniority: null,
      experienceRequirements: null,
    });
  });
});

describe('JobNormalizationService output', () => {
  const normalize = (title: string, description: string) =>
    new JobNormalizationService().normalize({
      externalId: 'x',
      source: 'test',
      company: 'Acme',
      title,
      location: 'Remote',
      description,
    });

  it('marks output as normalized and keeps stated requirements', () => {
    const job = normalize(
      'Senior Engineer',
      'Requires 5+ years of experience.',
    );
    expect(job.normalized).toBe(true);
    expect(job.seniority).toBe('Senior');
    expect(job.experienceRequirements).toMatchObject({ minYears: 5 });
  });

  it('does not default seniority to "Mid" or read it from the description', () => {
    const job = normalize(
      'Software Engineer',
      'You will work with senior engineers and staff architects.',
    );
    expect(job.seniority).toBeUndefined();
    expect(job.experienceRequirements).toBeUndefined();
  });
});

describe('match freshness', () => {
  const current: MatchSource = {
    matcherVersion: MATCHER_VERSION,
    profileVersion: 4,
    jobUpdatedAt: new Date('2026-09-01T00:00:00.000Z'),
    resumeProfileUpdatedAt: null,
    weightsKey: 'default',
  };

  it('is fresh only when every recorded input matches', () => {
    expect(isMatchFresh({ ...current }, current)).toBe(true);
  });

  it.each([
    [
      'legacy row (all null)',
      {
        matcherVersion: null,
        profileVersion: null,
        jobUpdatedAt: null,
        weightsKey: null,
      },
    ],
    ['older master profile version', { profileVersion: 3 }],
    ['older matcher', { matcherVersion: MATCHER_VERSION - 1 }],
    [
      'job changed since',
      { jobUpdatedAt: new Date('2026-08-01T00:00:00.000Z') },
    ],
    [
      'resume profile changed since',
      { resumeProfileUpdatedAt: new Date('2026-08-01T00:00:00.000Z') },
    ],
    ['different weights', { weightsKey: 'custom' }],
  ])('%s → stale', (_label, patch) => {
    expect(isMatchFresh({ ...current, ...patch }, current)).toBe(false);
  });

  it('keys weights: defaults (explicit or omitted) vs custom', () => {
    expect(weightsKey()).toBe('default');
    expect(weightsKey({ skill: 0.4 })).toBe('default');
    expect(weightsKey({ skill: 0.9 })).not.toBe('default');
  });
});
