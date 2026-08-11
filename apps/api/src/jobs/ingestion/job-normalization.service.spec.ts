import { JobNormalizationService } from './job-normalization.service';
import type { RawIngestedJob } from './job-source-adapter.interface';

describe('JobNormalizationService', () => {
  let service: JobNormalizationService;

  beforeEach(() => {
    service = new JobNormalizationService();
  });

  it('should clean title, company, and location', () => {
    const raw: RawIngestedJob = {
      externalId: 'test-1',
      source: 'linkedin-apify',
      company: '  Stripe  ',
      title: '  Senior Software  Engineer  ',
      location: '  San Francisco, CA  ',
      description: 'Role at Stripe building API.',
    };

    const normalized = service.normalize(raw);

    expect(normalized.company).toBe('Stripe');
    expect(normalized.title).toBe('Senior Software Engineer');
    expect(normalized.location).toBe('San Francisco, CA');
  });

  it('should extract skills correctly from rawSkills and description text', () => {
    const raw: RawIngestedJob = {
      externalId: 'test-2',
      source: 'linkedin-apify',
      company: 'Datadog',
      title: 'Full Stack Engineer',
      location: 'Remote',
      description:
        'We need expertise in React, TypeScript, Python, and PostgreSQL. Preferred experience with Docker and GraphQL.',
      rawSkills: ['React', 'TypeScript'],
    };

    const normalized = service.normalize(raw);

    expect(normalized.requiredSkills).toContain('React');
    expect(normalized.requiredSkills).toContain('TypeScript');
    expect(normalized.requiredSkills).toContain('Python');
    expect(normalized.requiredSkills).toContain('PostgreSQL');
    expect(normalized.preferredSkills).toContain('Docker');
    expect(normalized.preferredSkills).toContain('GraphQL');
  });

  it('should detect remote policy and isRemote boolean', () => {
    const remoteRaw: RawIngestedJob = {
      externalId: 'test-3',
      source: 'linkedin-apify',
      company: 'Vercel',
      title: 'Frontend Engineer',
      location: 'Remote (US)',
      description: '100% work from home remote role.',
      isRemote: true,
    };

    const hybridRaw: RawIngestedJob = {
      externalId: 'test-4',
      source: 'linkedin-apify',
      company: 'Google',
      title: 'Software Engineer',
      location: 'Mountain View, CA',
      description: '3 days in office hybrid policy.',
    };

    const normRemote = service.normalize(remoteRaw);
    const normHybrid = service.normalize(hybridRaw);

    expect(normRemote.isRemote).toBe(true);
    expect(normRemote.remotePolicy).toBe('REMOTE');

    expect(normHybrid.isRemote).toBe(false);
    expect(normHybrid.remotePolicy).toBe('HYBRID');
  });

  it('should parse salary range correctly from text', () => {
    const raw: RawIngestedJob = {
      externalId: 'test-5',
      source: 'linkedin-apify',
      company: 'Scale AI',
      title: 'Staff Engineer',
      location: 'SF',
      description: 'Competitive pay.',
      salaryText: '$180,000 - $240,000',
    };

    const normalized = service.normalize(raw);

    expect(normalized.salaryMin).toBe(180000);
    expect(normalized.salaryMax).toBe(240000);
    expect(normalized.salaryCurrency).toBe('USD');
    expect(normalized.salaryRange).toBe('$180,000 - $240,000');
  });

  it('should extract seniority and experience requirements from title and description', () => {
    const raw: RawIngestedJob = {
      externalId: 'test-6',
      source: 'linkedin-apify',
      company: 'OpenAI',
      title: 'Senior Infrastructure Engineer',
      location: 'San Francisco, CA',
      description:
        'Requires 5+ years of experience with Kubernetes and distributed systems.',
    };

    const normalized = service.normalize(raw);

    expect(normalized.seniority).toBe('Senior');
    expect(normalized.experienceRequirements).toEqual({
      minYears: 5,
      text: '5+ years',
    });
  });
});
