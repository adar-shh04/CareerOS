import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { htmlToText } from './html-to-text';
import {
  extractFromHtml,
  findJobPosting,
  mapGreenhouse,
  mapLever,
  parseGreenhouseUrl,
  parseLeverUrl,
} from './job-url-extractors';
import { JobUrlScraperService } from './job-url-scraper.service';
import {
  type FetchedText,
  SafeUrlFetcherService,
  UrlFetchError,
} from './safe-url-fetcher.service';

const LONG = 'You will design and build reliable backend services. '.repeat(3);

describe('htmlToText', () => {
  it('converts structure to plain text and strips scripts/styles/tags', () => {
    const text = htmlToText(
      '<style>p{color:red}</style><h2>About</h2><p>Hello&nbsp;<b>world</b> &amp; team</p><ul><li>Go</li><li>SQL</li></ul><script>alert(1)</script><!-- c -->',
    );
    expect(text).toBe('About\n\nHello world & team\n\n- Go\n- SQL');
    expect(text).not.toMatch(/alert|color|</);
  });

  it('unescapes entity-escaped markup (Greenhouse style)', () => {
    expect(
      htmlToText(
        '&lt;p&gt;Build &amp;amp; ship&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Go&lt;/li&gt;&lt;/ul&gt;',
      ),
    ).toBe('Build & ship\n\n- Go');
  });

  it('decodes numeric entities and drops invalid code points', () => {
    expect(htmlToText('caf&#233; &#x1F600; &#0; &#xD800;')).toBe(
      'café \u{1F600}',
    );
  });
});

describe('url parsers', () => {
  it.each([
    ['https://boards.greenhouse.io/acme/jobs/12345', 'acme', '12345'],
    [
      'https://job-boards.greenhouse.io/acme/jobs/12345?gh_src=x',
      'acme',
      '12345',
    ],
    ['https://job-boards.eu.greenhouse.io/acme/jobs/777', 'acme', '777'],
    [
      'https://boards.greenhouse.io/embed/job_app?for=acme&token=999',
      'acme',
      '999',
    ],
  ])('greenhouse %s', (url, board, jobId) => {
    expect(parseGreenhouseUrl(new URL(url))).toEqual({ board, jobId });
  });

  it('rejects greenhouse lookalikes and path tricks', () => {
    expect(
      parseGreenhouseUrl(new URL('https://evil.com/acme/jobs/1')),
    ).toBeNull();
    expect(
      parseGreenhouseUrl(
        new URL('https://boards.greenhouse.io.evil.com/a/jobs/1'),
      ),
    ).toBeNull();
    expect(
      parseGreenhouseUrl(new URL('https://boards.greenhouse.io/acme')),
    ).toBeNull();
    expect(
      parseGreenhouseUrl(
        new URL('https://boards.greenhouse.io/a%2F..%2Fx/jobs/1'),
      ),
    ).toBeNull();
  });

  it('parses lever', () => {
    expect(
      parseLeverUrl(
        new URL('https://jobs.lever.co/acme-corp/abc-123?lever-source=x'),
      ),
    ).toEqual({
      company: 'acme-corp',
      jobId: 'abc-123',
      eu: false,
    });
    expect(
      parseLeverUrl(new URL('https://jobs.eu.lever.co/acme/abc'))?.eu,
    ).toBe(true);
    expect(parseLeverUrl(new URL('https://jobs.lever.co/acme'))).toBeNull();
    expect(parseLeverUrl(new URL('https://lever.co.evil.com/a/b'))).toBeNull();
  });
});

describe('mapGreenhouse', () => {
  const ref = { board: 'acme-corp', jobId: '1' };
  it('maps the boards-api payload', () => {
    const draft = mapGreenhouse(
      {
        title: 'Senior Engineer',
        company_name: 'Acme Corp Inc',
        location: { name: 'Remote - US' },
        content: `&lt;p&gt;${LONG}&lt;/p&gt;`,
        pay_input_ranges: [
          { min_cents: 12000000, max_cents: 15000000, currency_type: 'USD' },
        ],
      },
      ref,
      'https://boards.greenhouse.io/acme-corp/jobs/1',
    );
    expect(draft).toMatchObject({
      title: 'Senior Engineer',
      company: 'Acme Corp Inc',
      location: 'Remote - US',
      isRemote: true,
      salaryRange: 'USD 120,000 - 150,000',
      sourceUrl: 'https://boards.greenhouse.io/acme-corp/jobs/1',
    });
    expect(draft?.description).toContain('reliable backend services');
    expect(draft?.description).not.toContain('<');
  });

  it('falls back to the board slug for company and returns null without content', () => {
    expect(
      mapGreenhouse({ title: 'T', content: `<p>${LONG}</p>` }, ref, 'u')
        ?.company,
    ).toBe('Acme Corp');
    expect(mapGreenhouse({ title: 'T', content: '' }, ref, 'u')).toBeNull();
    expect(mapGreenhouse(null, ref, 'u')).toBeNull();
  });

  it('caps the description to the DTO limit', () => {
    const draft = mapGreenhouse(
      { title: 'T', content: `<p>${'x'.repeat(80_000)}</p>` },
      ref,
      'u',
    );
    expect(draft?.description.length).toBe(50_000);
  });
});

describe('mapLever', () => {
  const ref = { company: 'acme', jobId: 'abc', eu: false };
  it('maps the postings payload', () => {
    const draft = mapLever(
      {
        text: 'Staff Engineer',
        categories: { location: 'Berlin', allLocations: ['Berlin'] },
        workplaceType: 'remote',
        descriptionPlain: LONG,
        lists: [{ text: 'Requirements', content: '<li>Go</li><li>SQL</li>' }],
        additionalPlain: 'We are an equal opportunity employer.',
        salaryRange: {
          min: 100000,
          max: 140000,
          currency: 'EUR',
          interval: 'per-year-salary',
        },
      },
      ref,
      'https://jobs.lever.co/acme/abc',
    );
    expect(draft).toMatchObject({
      title: 'Staff Engineer',
      company: 'Acme',
      location: 'Berlin',
      isRemote: true,
      salaryRange: 'EUR 100,000 - 140,000 / year',
    });
    expect(draft?.description).toContain('Requirements');
    expect(draft?.description).toContain('- Go');
    expect(draft?.description).toContain('equal opportunity');
  });

  it('returns null with no description', () => {
    expect(mapLever({ text: 'T' }, ref, 'u')).toBeNull();
  });
});

describe('JSON-LD extraction', () => {
  const posting = {
    '@type': 'JobPosting',
    title: 'Data Engineer',
    description: `<p>${LONG}</p>`,
    hiringOrganization: { '@type': 'Organization', name: 'Globex' },
    jobLocation: {
      '@type': 'Place',
      address: {
        addressLocality: 'Austin',
        addressRegion: 'TX',
        addressCountry: 'US',
      },
    },
    baseSalary: {
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value: { minValue: 90000, maxValue: 120000, unitText: 'YEAR' },
    },
  };
  const page = (json: unknown, extra = '') =>
    `<html><head>${extra}<script type="application/ld+json">${JSON.stringify(json)}</script></head></html>`;

  it('reads a plain JobPosting', () => {
    const draft = extractFromHtml(
      page(posting),
      'https://globex.com/j/1',
      'globex.com',
    );
    expect(draft).toMatchObject({
      title: 'Data Engineer',
      company: 'Globex',
      location: 'Austin, TX, US',
      isRemote: false,
      salaryRange: 'USD 90,000 - 120,000 / year',
    });
  });

  it('finds the posting in @graph and arrays, and detects TELECOMMUTE', () => {
    const graph = {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebSite' },
        { ...posting, jobLocationType: 'TELECOMMUTE' },
      ],
    };
    expect(extractFromHtml(page(graph), 'u', 'h')?.isRemote).toBe(true);
    expect(findJobPosting([{ '@type': 'Thing' }, posting])).toBe(posting);
    expect(findJobPosting({ '@type': ['Thing', 'JobPosting'] })).not.toBeNull();
  });

  it('skips malformed blocks and uses the next one', () => {
    const html = `<script type="application/ld+json">{bad json</script>${page(posting)}`;
    expect(extractFromHtml(html, 'u', 'h')?.title).toBe('Data Engineer');
  });

  it('returns null with no JobPosting or an empty description', () => {
    expect(
      extractFromHtml(page({ '@type': 'Organization' }), 'u', 'h'),
    ).toBeNull();
    expect(
      extractFromHtml(page({ ...posting, description: '' }), 'u', 'h'),
    ).toBeNull();
    expect(extractFromHtml('<html>nothing</html>', 'u', 'h')).toBeNull();
  });

  it('falls back to og:site_name then host for the company', () => {
    const noOrg = { ...posting, hiringOrganization: undefined };
    expect(
      extractFromHtml(
        page(noOrg, '<meta property="og:site_name" content="Globex Careers">'),
        'u',
        'www.globex.com',
      )?.company,
    ).toBe('Globex Careers');
    expect(extractFromHtml(page(noOrg), 'u', 'www.globex.com')?.company).toBe(
      'globex.com',
    );
  });
});

describe('JobUrlScraperService', () => {
  const fetchText = jest.fn();
  const fetcher = {
    parseAndValidateUrl: (u: string) =>
      new SafeUrlFetcherService().parseAndValidateUrl(u),
    fetchText,
  } as unknown as SafeUrlFetcherService;
  const scraper = new JobUrlScraperService(fetcher);
  const ok = (text: string, contentType = 'text/html'): FetchedText => ({
    finalUrl: new URL('https://x.example/'),
    status: 200,
    contentType,
    text,
  });

  beforeEach(() => fetchText.mockReset());

  it('uses the Greenhouse boards-api for greenhouse URLs', async () => {
    fetchText.mockResolvedValueOnce(
      ok(
        JSON.stringify({
          title: 'Eng',
          content: `<p>${LONG}</p>`,
          location: { name: 'NYC' },
        }),
        'application/json',
      ),
    );
    const draft = await scraper.importFromUrl(
      'https://boards.greenhouse.io/acme/jobs/42#apply',
    );
    expect(String((fetchText.mock.calls as unknown[][])[0][0])).toContain(
      'https://boards-api.greenhouse.io/v1/boards/acme/jobs/42',
    );
    expect(draft.sourceUrl).toBe('https://boards.greenhouse.io/acme/jobs/42');
    expect(draft.company).toBe('Acme');
  });

  it('uses the Lever API for lever URLs', async () => {
    fetchText.mockResolvedValueOnce(
      ok(
        JSON.stringify({ text: 'Eng', descriptionPlain: LONG }),
        'application/json',
      ),
    );
    const draft = await scraper.importFromUrl(
      'https://jobs.lever.co/acme/abc-1',
    );
    expect(String((fetchText.mock.calls as unknown[][])[0][0])).toBe(
      'https://api.lever.co/v0/postings/acme/abc-1',
    );
    expect(draft.title).toBe('Eng');
  });

  it('falls back to the page JSON-LD when the ATS API fails', async () => {
    const ld = JSON.stringify({
      '@type': 'JobPosting',
      title: 'Eng',
      description: LONG,
      hiringOrganization: 'Acme',
    });
    fetchText
      .mockRejectedValueOnce(new UrlFetchError('http_status', 'HTTP 404', 404))
      .mockResolvedValueOnce(
        ok(`<script type="application/ld+json">${ld}</script>`),
      );
    const draft = await scraper.importFromUrl(
      'https://boards.greenhouse.io/acme/jobs/42',
    );
    expect(draft.company).toBe('Acme');
    expect(fetchText).toHaveBeenCalledTimes(2);
  });

  it('does not fall back when the ATS target is blocked', async () => {
    fetchText.mockRejectedValueOnce(new UrlFetchError('blocked', 'nope'));
    await expect(
      scraper.importFromUrl('https://boards.greenhouse.io/acme/jobs/42'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchText).toHaveBeenCalledTimes(1);
  });

  it('imports a generic page via JSON-LD', async () => {
    const ld = JSON.stringify({
      '@type': 'JobPosting',
      title: 'Eng',
      description: LONG,
      hiringOrganization: { name: 'Globex' },
    });
    fetchText.mockResolvedValueOnce(
      ok(`<script type="application/ld+json">${ld}</script>`),
    );
    const draft = await scraper.importFromUrl(
      'https://careers.globex.com/jobs/1',
    );
    expect(draft.company).toBe('Globex');
    expect(draft.description.length).toBeGreaterThan(0);
  });

  it('returns a clear 422 for login-walled LinkedIn pages without JSON-LD', async () => {
    fetchText.mockResolvedValueOnce(ok('<html>Sign in</html>'));
    const err = await scraper
      .importFromUrl('https://www.linkedin.com/jobs/view/123')
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UnprocessableEntityException);
    expect((err as Error).message).toMatch(
      /LinkedIn.*paste the job description/i,
    );
  });

  it('maps LinkedIn 999 to the same 422', async () => {
    fetchText.mockRejectedValueOnce(
      new UrlFetchError('http_status', 'HTTP 999', 999),
    );
    await expect(
      scraper.importFromUrl('https://www.linkedin.com/jobs/view/123'),
    ).rejects.toThrow(/LinkedIn/);
  });

  it('returns 422 telling the user to paste when nothing is extractable', async () => {
    fetchText.mockResolvedValueOnce(ok('<html><body>JS app</body></html>'));
    const err = await scraper
      .importFromUrl('https://example.com/j')
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UnprocessableEntityException);
    expect((err as Error).message).toMatch(/paste the job description/i);
  });

  it('maps unsafe URLs to 400 and fetch failures to 422', async () => {
    await expect(
      scraper.importFromUrl('ftp://example.com/x'),
    ).rejects.toBeInstanceOf(BadRequestException);
    fetchText.mockRejectedValueOnce(
      new UrlFetchError('timeout', 'The site took too long to respond.'),
    );
    await expect(
      scraper.importFromUrl('https://example.com/x'),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    fetchText.mockRejectedValueOnce(new UrlFetchError('blocked', 'private'));
    await expect(
      scraper.importFromUrl('https://example.com/x'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
