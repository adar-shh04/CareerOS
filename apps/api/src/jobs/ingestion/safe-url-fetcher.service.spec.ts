import { Readable } from 'node:stream';

import { isBlockedAddress } from './ip-guard';
import {
  type HttpTransport,
  SafeUrlFetcherService,
  type TransportResponse,
  UrlFetchError,
} from './safe-url-fetcher.service';

function respond(
  status: number,
  headers: Record<string, string>,
  chunks: string[] = [],
): TransportResponse {
  return {
    status,
    headers,
    body: Readable.from(chunks.map((c) => Buffer.from(c))),
    destroy: jest.fn(),
  };
}

const PUBLIC = [{ address: '93.184.216.34', family: 4 as const }];

function make(
  transport: HttpTransport,
  lookup = jest.fn().mockResolvedValue(PUBLIC),
  extra: { timeoutMs?: number; maxBytes?: number } = {},
) {
  return {
    lookup,
    fetcher: new SafeUrlFetcherService({ lookup, transport, ...extra }),
  };
}

const html = (body = '<p>ok</p>') =>
  respond(200, { 'content-type': 'text/html; charset=utf-8' }, [body]);

describe('isBlockedAddress', () => {
  it.each([
    '127.0.0.1',
    '127.255.255.254',
    '10.0.0.1',
    '10.255.255.255',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '100.100.100.200',
    '0.0.0.0',
    '224.0.0.1',
    '255.255.255.255',
    '240.0.0.1',
    '198.18.0.1',
    '::',
    '::1',
    'fc00::1',
    'fd00:ec2::254',
    'fe80::1',
    'fe80::1%eth0',
    'ff02::1',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
    '::ffff:10.1.2.3',
    '::ffff:169.254.169.254',
    '::127.0.0.1',
    '64:ff9b::7f00:1',
    '2002:7f00:1::1',
    '2001:db8::1',
    '0:0:0:0:0:0:0:1',
    // Outside global unicast 2000::/3: never acceptable, whatever the range
    '4000::1',
    '5f00::1',
    '8000::1',
    'a000::1',
    'c000::1',
    'e000::1',
    '1000::1',
    '100::1',
    'fec0::1',
    // Special-purpose space inside 2000::/3
    '2001::1',
    '2001:1::1',
    '2001:2::1',
    '2001:10::1',
    '2001:1ff:ffff::1',
    '3fff::1',
    '3fff:fff::1',
  ])('blocks %s', (ip) => {
    expect(isBlockedAddress(ip)).toBe(true);
  });

  it.each([
    '93.184.216.34',
    '8.8.8.8',
    '172.15.255.255',
    '172.32.0.1',
    '100.63.255.255',
    '100.128.0.1',
    '2606:4700:4700::1111',
    '2a00:1450:4001:81b::200e',
    '2001:4860:4860::8888',
    '2001:200::1', // APNIC allocation, just past 2001::/23
    '2400:cb00::1',
    '3ffe::1',
    '::ffff:8.8.8.8',
    '64:ff9b::808:808', // NAT64 of 8.8.8.8
    '2002:808:808::1', // 6to4 of 8.8.8.8
  ])('allows %s', (ip) => {
    expect(isBlockedAddress(ip)).toBe(false);
  });

  it('fails closed on garbage', () => {
    expect(isBlockedAddress('not-an-ip')).toBe(true);
  });
});

describe('SafeUrlFetcherService URL validation', () => {
  const transport = jest.fn();
  beforeEach(() => transport.mockReset());

  it.each([
    ['ftp://example.com/job', 'invalid_url'],
    ['file:///etc/passwd', 'invalid_url'],
    ['javascript:alert(1)', 'invalid_url'],
    ['not a url', 'invalid_url'],
    ['https://user:pass@example.com/job', 'invalid_url'],
    ['http://example.com:8080/job', 'blocked'],
    ['https://example.com:22/job', 'blocked'],
    ['http://localhost/job', 'blocked'],
    ['http://foo.localhost/job', 'blocked'],
    ['http://metadata.google.internal/', 'blocked'],
    ['http://127.0.0.1/', 'blocked'],
    ['http://2130706433/', 'blocked'], // decimal 127.0.0.1
    ['http://0x7f.1/', 'blocked'], // hex shorthand
    ['http://10.0.0.5/', 'blocked'],
    ['http://172.16.5.5/', 'blocked'],
    ['http://192.168.0.10/', 'blocked'],
    ['http://169.254.169.254/latest/meta-data', 'blocked'],
    ['http://[::1]/', 'blocked'],
    ['http://[fc00::1]/', 'blocked'],
    ['http://[fe80::1]/', 'blocked'],
    ['http://[::ffff:127.0.0.1]/', 'blocked'],
    ['http://[::ffff:7f00:1]/', 'blocked'],
  ])('rejects %s before any network call', async (url, code) => {
    const { fetcher } = make(transport);
    await expect(fetcher.fetchText(url, 'text/html')).rejects.toMatchObject({
      name: 'UrlFetchError',
      code,
    });
    expect(transport).not.toHaveBeenCalled();
  });

  it('rejects overlong URLs', async () => {
    const { fetcher } = make(transport);
    await expect(
      fetcher.fetchText(`https://example.com/${'a'.repeat(2100)}`, 'text/html'),
    ).rejects.toMatchObject({ code: 'invalid_url' });
  });

  it('allows explicit standard ports', async () => {
    const t: HttpTransport = jest.fn().mockImplementation(() => html());
    const { fetcher } = make(t);
    await expect(
      fetcher.fetchText('https://example.com:443/job', 'text/html'),
    ).resolves.toBeDefined();
    await expect(
      fetcher.fetchText('http://example.com:80/job', 'text/html'),
    ).resolves.toBeDefined();
  });
});

describe('SafeUrlFetcherService DNS handling', () => {
  it.each([
    [[{ address: '127.0.0.1', family: 4 as const }]],
    [[{ address: '10.1.1.1', family: 4 as const }]],
    [[{ address: '::1', family: 6 as const }]],
    [[{ address: '::ffff:127.0.0.1', family: 6 as const }]],
    [
      // mixed answer: one public, one private is still rejected
      [
        { address: '93.184.216.34', family: 4 as const },
        { address: '192.168.1.1', family: 4 as const },
      ],
    ],
  ])(
    'rejects hostnames resolving to non-public addresses %j',
    async (answer) => {
      const transport = jest.fn();
      const { fetcher } = make(transport, jest.fn().mockResolvedValue(answer));
      await expect(
        fetcher.fetchText('https://evil.example/job', 'text/html'),
      ).rejects.toMatchObject({ code: 'blocked' });
      expect(transport).not.toHaveBeenCalled();
    },
  );

  it('reports DNS failures', async () => {
    const transport = jest.fn();
    const { fetcher } = make(
      transport,
      jest.fn().mockRejectedValue(new Error('ENOTFOUND')),
    );
    await expect(
      fetcher.fetchText('https://nope.example/job', 'text/html'),
    ).rejects.toMatchObject({ code: 'dns' });
  });

  it('pins the connection to the validated address and sends no cookies', async () => {
    const transport = jest.fn<
      ReturnType<HttpTransport>,
      Parameters<HttpTransport>
    >(() => Promise.resolve(html()));
    const { fetcher } = make(transport);
    await fetcher.fetchText('https://example.com/job', 'text/html');
    const request = transport.mock.calls[0][0];
    expect(request.address).toEqual(PUBLIC[0]);
    expect(Object.keys(request.headers).map((h) => h.toLowerCase())).toEqual(
      expect.not.arrayContaining(['cookie', 'authorization']),
    );
    expect(request.headers['User-Agent']).toMatch(/^CareerOS-JobImporter/);
  });
});

describe('SafeUrlFetcherService redirects', () => {
  it('follows a public redirect and re-resolves each hop', async () => {
    const transport = jest
      .fn()
      .mockResolvedValueOnce(respond(302, { location: '/moved' }))
      .mockResolvedValueOnce(html('<p>final</p>'));
    const { fetcher, lookup } = make(transport);
    const result = await fetcher.fetchText(
      'https://example.com/a',
      'text/html',
    );
    expect(result.text).toBe('<p>final</p>');
    expect(result.finalUrl.toString()).toBe('https://example.com/moved');
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it('rejects a redirect to a private IP literal', async () => {
    const transport = jest
      .fn()
      .mockResolvedValueOnce(
        respond(302, { location: 'http://169.254.169.254/latest/meta-data' }),
      );
    const { fetcher } = make(transport);
    await expect(
      fetcher.fetchText('https://example.com/a', 'text/html'),
    ).rejects.toMatchObject({ code: 'blocked' });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('rejects a redirect to a hostname that resolves privately', async () => {
    const lookup = jest
      .fn()
      .mockResolvedValueOnce(PUBLIC)
      .mockResolvedValueOnce([{ address: '10.0.0.7', family: 4 }]);
    const transport = jest
      .fn()
      .mockResolvedValueOnce(
        respond(301, { location: 'https://internal.corp.example/admin' }),
      );
    const { fetcher } = make(transport, lookup);
    await expect(
      fetcher.fetchText('https://example.com/a', 'text/html'),
    ).rejects.toMatchObject({ code: 'blocked' });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('rejects a redirect to a non-http scheme or non-standard port', async () => {
    for (const location of ['file:///etc/passwd', 'http://example.com:9200/']) {
      const transport = jest
        .fn()
        .mockResolvedValueOnce(respond(302, { location }));
      const { fetcher } = make(transport);
      await expect(
        fetcher.fetchText('https://example.com/a', 'text/html'),
      ).rejects.toBeInstanceOf(UrlFetchError);
      expect(transport).toHaveBeenCalledTimes(1);
    }
  });

  it('allows at most 3 redirects', async () => {
    const loop = jest
      .fn()
      .mockImplementation(() => respond(302, { location: '/next' }));
    const { fetcher } = make(loop);
    await expect(
      fetcher.fetchText('https://example.com/a', 'text/html'),
    ).rejects.toMatchObject({ code: 'too_many_redirects' });
    expect(loop).toHaveBeenCalledTimes(4); // initial + 3 redirects

    const three = jest
      .fn()
      .mockResolvedValueOnce(respond(302, { location: '/1' }))
      .mockResolvedValueOnce(respond(302, { location: '/2' }))
      .mockResolvedValueOnce(respond(302, { location: '/3' }))
      .mockResolvedValueOnce(html());
    await expect(
      make(three).fetcher.fetchText('https://example.com/a', 'text/html'),
    ).resolves.toBeDefined();
  });
});

describe('SafeUrlFetcherService response limits', () => {
  it('aborts when the streamed body exceeds the cap', async () => {
    const res = respond(200, { 'content-type': 'text/html' }, [
      'a'.repeat(600),
      'b'.repeat(600),
    ]);
    const { fetcher } = make(jest.fn().mockResolvedValue(res), undefined, {
      maxBytes: 1000,
    });
    await expect(
      fetcher.fetchText('https://example.com/a', 'text/html'),
    ).rejects.toMatchObject({ code: 'too_large' });
    expect(res.destroy).toHaveBeenCalled();
  });

  it('rejects a declared content-length over the cap without reading', async () => {
    const res = respond(
      200,
      { 'content-type': 'text/html', 'content-length': '999999999' },
      ['x'],
    );
    const { fetcher } = make(jest.fn().mockResolvedValue(res));
    await expect(
      fetcher.fetchText('https://example.com/a', 'text/html'),
    ).rejects.toMatchObject({ code: 'too_large' });
  });

  it.each(['image/png', 'application/pdf', 'text/plain', ''])(
    'rejects content type "%s"',
    async (contentType) => {
      const res = respond(200, { 'content-type': contentType }, ['x']);
      const { fetcher } = make(jest.fn().mockResolvedValue(res));
      await expect(
        fetcher.fetchText('https://example.com/a', 'text/html'),
      ).rejects.toMatchObject({ code: 'bad_content_type' });
    },
  );

  it.each([
    'application/json',
    'application/ld+json',
    'text/html; charset=UTF-8',
  ])('accepts content type %s', async (contentType) => {
    const res = respond(200, { 'content-type': contentType }, ['{}']);
    const { fetcher } = make(jest.fn().mockResolvedValue(res));
    await expect(
      fetcher.fetchText('https://example.com/a', 'text/html'),
    ).resolves.toMatchObject({ text: '{}' });
  });

  it('reports non-2xx statuses', async () => {
    const { fetcher } = make(
      jest
        .fn()
        .mockResolvedValue(respond(404, { 'content-type': 'text/html' })),
    );
    await expect(
      fetcher.fetchText('https://example.com/a', 'text/html'),
    ).rejects.toMatchObject({ code: 'http_status', status: 404 });
  });

  it('times out when the transport never answers', async () => {
    const transport: HttpTransport = () => new Promise(() => undefined);
    const { fetcher } = make(transport, undefined, { timeoutMs: 30 });
    await expect(
      fetcher.fetchText('https://example.com/a', 'text/html'),
    ).rejects.toMatchObject({ code: 'timeout' });
  });

  it('times out when the body stalls', async () => {
    const res: TransportResponse = {
      status: 200,
      headers: { 'content-type': 'text/html' },
      body: (async function* () {
        yield Buffer.from('start');
        await new Promise(() => undefined);
      })(),
      destroy: jest.fn(),
    };
    const { fetcher } = make(jest.fn().mockResolvedValue(res), undefined, {
      timeoutMs: 30,
    });
    await expect(
      fetcher.fetchText('https://example.com/a', 'text/html'),
    ).rejects.toMatchObject({ code: 'timeout' });
    expect(res.destroy).toHaveBeenCalled();
  });
});
