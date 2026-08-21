import {
  ApifyConfigurationError,
  ApifyIngestionError,
  ApifyLinkedInAdapter,
} from './apify-linkedin.adapter';

describe('ApifyLinkedInAdapter', () => {
  let adapter: ApifyLinkedInAdapter;
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    adapter = new ApifyLinkedInAdapter();
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('fetchJobs configuration validation', () => {
    it('throws ApifyConfigurationError when APIFY_API_TOKEN is missing and no apiKey provided', async () => {
      delete process.env.APIFY_API_TOKEN;

      await expect(
        adapter.fetchJobs({ query: 'Software Engineer', limit: 5 }),
      ).rejects.toThrow(ApifyConfigurationError);
    });

    it('uses apiKey from params when provided even if env var is missing', async () => {
      delete process.env.APIFY_API_TOKEN;

      const mockResponse = [
        {
          id: 'li-live-101',
          title: 'Live Backend Engineer',
          companyName: 'Acme Corp',
          location: 'San Francisco, CA',
          description: 'Live job description',
        },
      ];

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const jobs = await adapter.fetchJobs({
        query: 'Backend Engineer',
        apiKey: 'custom-apify-token-xyz',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('token=custom-apify-token-xyz'),
        expect.any(Object),
      );
      expect(jobs).toHaveLength(1);
      expect(jobs[0]?.title).toBe('Live Backend Engineer');
      expect(jobs[0]?.company).toBe('Acme Corp');
    });
  });

  describe('Apify API error handling & no mock fallback', () => {
    it('throws ApifyIngestionError when Apify returns non-200 HTTP status', async () => {
      process.env.APIFY_API_TOKEN = 'test-token';

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized: Invalid Apify token'),
      });

      await expect(
        adapter.fetchJobs({ query: 'Software Engineer' }),
      ).rejects.toThrow(ApifyIngestionError);
    });

    it('throws ApifyIngestionError when network error occurs during fetch', async () => {
      process.env.APIFY_API_TOKEN = 'test-token';

      global.fetch = jest.fn().mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expect(
        adapter.fetchJobs({ query: 'Software Engineer' }),
      ).rejects.toThrow(ApifyIngestionError);
    });

    it('throws ApifyIngestionError when response payload is not an array', async () => {
      process.env.APIFY_API_TOKEN = 'test-token';

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ error: 'Invalid format' }),
      });

      await expect(
        adapter.fetchJobs({ query: 'Software Engineer' }),
      ).rejects.toThrow(ApifyIngestionError);
    });

    it('never returns mock/sample jobs on failure', async () => {
      delete process.env.APIFY_API_TOKEN;

      // Ensure that under no circumstance is sample Stripe / Datadog data returned
      try {
        await adapter.fetchJobs({ query: 'Software Engineer' });
        fail('Should have thrown ApifyConfigurationError');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ApifyConfigurationError);
      }
    });
  });

  describe('successful live ingestion parsing', () => {
    it('correctly maps raw Apify items into RawIngestedJob objects', async () => {
      process.env.APIFY_API_TOKEN = 'valid-token';

      const mockItems = [
        {
          jobId: 'li-99901',
          title: 'Senior Systems Architect',
          companyName: 'CloudScale Inc',
          location: 'Remote, US',
          link: 'https://linkedin.com/jobs/view/99901',
          description: 'High scale distributed systems engineer.',
          salary: '$200,000 - $250,000',
          postedAt: '2026-08-20T10:00:00.000Z',
          isRemote: true,
          skills: ['Go', 'Kubernetes', 'PostgreSQL'],
        },
      ];

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockItems),
      });

      const jobs = await adapter.fetchJobs({ query: 'Architect' });

      expect(jobs).toHaveLength(1);
      const job = jobs[0];
      expect(job.externalId).toBe('li-99901');
      expect(job.source).toBe('linkedin-apify');
      expect(job.company).toBe('CloudScale Inc');
      expect(job.title).toBe('Senior Systems Architect');
      expect(job.location).toBe('Remote, US');
      expect(job.isRemote).toBe(true);
      expect(job.salaryText).toBe('$200,000 - $250,000');
      expect(job.rawSkills).toEqual(['Go', 'Kubernetes', 'PostgreSQL']);
    });
  });
});
