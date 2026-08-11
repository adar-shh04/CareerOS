import { ApifyLinkedInAdapter } from './apify-linkedin.adapter';

describe('ApifyLinkedInAdapter', () => {
  let adapter: ApifyLinkedInAdapter;

  beforeEach(() => {
    adapter = new ApifyLinkedInAdapter();
  });

  it('should return mock jobs when APIFY_API_TOKEN is not set', async () => {
    delete process.env.APIFY_API_TOKEN;

    const rawJobs = await adapter.fetchJobs({
      query: 'Software Engineer',
      limit: 5,
    });

    expect(rawJobs).toBeDefined();
    expect(rawJobs.length).toBeGreaterThan(0);
    expect(rawJobs[0]?.source).toBe('linkedin-apify');
    expect(rawJobs[0]?.externalId).toBeDefined();
    expect(rawJobs[0]?.company).toBeDefined();
  });
});
