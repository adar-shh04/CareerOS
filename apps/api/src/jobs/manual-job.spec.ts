import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateManualJobDto } from './create-manual-job.dto';
import type { ApifyLinkedInAdapter } from './ingestion/apify-linkedin.adapter';
import { JobDeduplicationService } from './ingestion/job-deduplication.service';
import { JobIngestionService } from './ingestion/job-ingestion.service';
import { JobNormalizationService } from './ingestion/job-normalization.service';
import type { CreateJobInput } from './jobs.types';
import type { PrismaJobsRepository } from './prisma-jobs.repository';

const DESCRIPTION =
  'We are hiring a Senior Backend Engineer. You will build APIs with TypeScript, Node.js and PostgreSQL. 5+ years of experience required.';

async function errorsFor(body: Record<string, unknown>) {
  const dto = plainToInstance(CreateManualJobDto, body);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errors.map((e) => e.property);
}

describe('CreateManualJobDto', () => {
  const valid = {
    title: 'Senior Backend Engineer',
    company: 'Acme',
    description: DESCRIPTION,
  };

  it('accepts a minimal valid job', async () => {
    expect(await errorsFor(valid)).toEqual([]);
  });

  it('requires title, company and a real description', async () => {
    expect(await errorsFor({})).toEqual(
      expect.arrayContaining(['title', 'company', 'description']),
    );
    expect(await errorsFor({ ...valid, description: 'too short' })).toContain(
      'description',
    );
  });

  it('rejects non-http(s) source URLs (the drawer renders it as a link)', async () => {
    for (const sourceUrl of [
      'javascript:alert(1)',
      'data:text/html,<script>1</script>',
      'ftp://example.com/job',
      'example.com/job',
    ]) {
      expect(await errorsFor({ ...valid, sourceUrl })).toContain('sourceUrl');
    }
    expect(
      await errorsFor({
        ...valid,
        sourceUrl: 'https://boards.greenhouse.io/x/1',
      }),
    ).toEqual([]);
  });

  it('rejects unknown fields (cannot set owner or source)', async () => {
    expect(
      await errorsFor({
        ...valid,
        ownerOrganizationId: 'x',
        source: 'linkedin',
      }),
    ).toEqual(expect.arrayContaining(['ownerOrganizationId', 'source']));
  });

  it('caps description length', async () => {
    expect(
      await errorsFor({ ...valid, description: 'x'.repeat(50_001) }),
    ).toContain('description');
  });
});

describe('JobDeduplicationService.computeOwnedFingerprint', () => {
  const dedup = new JobDeduplicationService();
  const job = {
    company: 'Acme',
    title: 'Engineer',
    location: 'Remote',
  } as CreateJobInput;

  it('differs per owner and from the shared fingerprint, but is stable per owner', () => {
    const a = dedup.computeOwnedFingerprint(job, 'org-a');
    expect(a).toBe(dedup.computeOwnedFingerprint(job, 'org-a'));
    expect(a).not.toBe(dedup.computeOwnedFingerprint(job, 'org-b'));
    expect(a).not.toBe(dedup.computeFingerprint(job));
  });
});

describe('JobDeduplicationService.normalizeSourceUrl', () => {
  const dedup = new JobDeduplicationService();

  it('treats tracking params, fragments, host case and trailing slash as the same posting', () => {
    const canonical = 'https://boards.greenhouse.io/acme/jobs/123';
    for (const url of [
      'https://boards.greenhouse.io/acme/jobs/123/',
      'HTTPS://Boards.Greenhouse.io/acme/jobs/123?utm_source=x&gh_src=abc#apply',
      '  https://boards.greenhouse.io/acme/jobs/123?trk=public  ',
    ]) {
      expect(dedup.normalizeSourceUrl(url)).toBe(canonical);
    }
  });

  it('keeps meaningful query params and rejects non-http(s) input', () => {
    expect(
      dedup.normalizeSourceUrl('https://x.com/jobs?gh_jid=42&utm_x=1'),
    ).toBe('https://x.com/jobs?gh_jid=42');
    expect(dedup.normalizeSourceUrl('javascript:alert(1)')).toBeUndefined();
    expect(dedup.normalizeSourceUrl('not a url')).toBeUndefined();
    expect(dedup.normalizeSourceUrl(undefined)).toBeUndefined();
  });
});

describe('JobIngestionService.ingestManual', () => {
  const build = (existing: unknown = null) => {
    const upsert = jest.fn((input: CreateJobInput) =>
      Promise.resolve({
        job: { id: 'job-1', ...input },
        created: true,
      }),
    );
    const findDup = jest.fn(() => Promise.resolve(existing));
    const service = new JobIngestionService(
      { sourceId: 'linkedin-apify' } as ApifyLinkedInAdapter,
      new JobNormalizationService(),
      new JobDeduplicationService(),
      {
        createPrivateJobIfAbsent: upsert,
        findVisibleDuplicate: findDup,
      } as unknown as PrismaJobsRepository,
    );
    return { service, upsert, findDup };
  };
  const raw = {
    title: '  Senior Backend Engineer ',
    company: 'Acme',
    location: 'Remote',
    description: DESCRIPTION,
  };

  it('stores a private, normalized, adapter-free job when there is no duplicate', async () => {
    const { service, upsert } = build();
    const result = await service.ingestManual(raw, 'org-a');
    expect(result.created).toBe(true);

    const input = upsert.mock.calls[0][0];
    expect(input).toMatchObject({
      ownerOrganizationId: 'org-a',
      source: 'manual',
      title: 'Senior Backend Engineer',
      normalized: true,
    });
    expect(input.externalId).toBeUndefined();
    expect(input.fingerprint).toBe(
      new JobDeduplicationService().computeOwnedFingerprint(input, 'org-a'),
    );
    expect(input.requiredSkills?.length).toBeGreaterThan(0);
  });

  it('returns a visible duplicate untouched: no create, no update', async () => {
    const existing = { id: 'old-1', title: 'Senior Backend Engineer' };
    const { service, upsert, findDup } = build(existing);
    const result = await service.ingestManual(
      { ...raw, sourceUrl: 'https://x.com/j/1/?utm_source=a#top' },
      'org-a',
    );
    expect(result).toEqual({ job: existing, created: false });
    expect(upsert).not.toHaveBeenCalled();

    const [ws, match] = findDup.mock.calls[0] as unknown as [
      string,
      { sourceUrl?: string; fingerprints: string[] },
    ];
    expect(ws).toBe('org-a');
    expect(match.sourceUrl).toBe('https://x.com/j/1');
    // owned fingerprint + the shared-catalog fingerprint
    expect(match.fingerprints).toHaveLength(2);
  });

  it('without a location, only an identical description counts as a duplicate', async () => {
    const { service, findDup } = build();
    await service.ingestManual({ ...raw, location: '' }, 'org-a');
    await service.ingestManual(
      { ...raw, location: '', description: DESCRIPTION + ' Different team.' },
      'org-a',
    );
    const fps = findDup.mock.calls.map(
      (c) =>
        (c as unknown as [string, { fingerprints: string[] }])[1].fingerprints,
    );
    // no shared-catalog fingerprint when the location is unknown
    expect(fps[0]).toHaveLength(1);
    expect(fps[0][0]).not.toBe(fps[1][0]);
  });

  it('reports a lost insert race as a duplicate, not a creation', async () => {
    const { service, upsert } = build();
    const winner = { id: 'winner-1', title: 'Senior Backend Engineer' };
    upsert.mockResolvedValueOnce({
      job: winner as never,
      created: false,
    });
    const result = await service.ingestManual(raw, 'org-a');
    expect(result).toEqual({ job: winner, created: false });
  });
});
