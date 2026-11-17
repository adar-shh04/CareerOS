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
  describe('IPv4 (unchanged protections)', () => {
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
    ])('allows %s', (ip) => {
      expect(isBlockedAddress(ip)).toBe(false);
    });
  });

  describe('IPv6 special-purpose and non-global addresses', () => {
    it.each([
      '::', // unspecified
      '::1',
      '0:0:0:0:0:0:0:1',
      'fc00::1', // unique-local
      'fd00:ec2::254', // AWS metadata
      'fe80::1', // link-local
      'fe80::1%eth0',
      'FE80::1%lo',
      'fec0::1', // deprecated site-local
      'ff02::1', // multicast
      'ff00::',
      '100::1', // discard-only 100::/64
      '100:0:0:1::1', // dummy prefix
      '5f00::1', // SRv6 SIDs
      '2001::1', // Teredo / IETF protocol assignments 2001::/23
      '2001:0:4136:e378:8000:63bf:3fff:fdd2',
      '2001:1::1', // PCP anycast (globally reachable, still not a web host)
      '2001:2::1', // benchmarking
      '2001:3::1', // AMT
      '2001:10::1', // deprecated ORCHID
      '2001:20::1', // ORCHIDv2
      '2001:1ff:ffff::1', // last address of 2001::/23
      '2001:db8::1', // documentation, nested inside an allocated /23
      '2001:db8:ffff:ffff:ffff:ffff:ffff:ffff',
      '2620:4f:8000::1', // AS112 direct delegation, nested in 2620::/23
      '3fff::1', // documentation (RFC 9637)
      '3fff:fff:ffff:ffff:ffff:ffff:ffff:ffff',
    ])('blocks %s', (ip) => {
      expect(isBlockedAddress(ip)).toBe(true);
    });
  });

  describe('IPv6 reserved / unallocated space (allow-list, not deny-list)', () => {
    // 3ffe::/16 is the returned 6bone block; IANA lists it RESERVED.
    it.each([
      '3ffe::1',
      '3ffe:831f:ce49:7601:8000:efff:af4a:86bf', // old pre-Teredo prefix
      '3ffe:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
      '3ffd::1',
      // The first address of every IANA RESERVED block inside 2000::/3.
      '2d00::',
      '2e00::',
      '3000::',
      '3800::',
      '3c00::',
      '3e00::',
      '3f00::',
      '3f80::',
      '3fc0::',
      '3fe0::',
      '3ff0::',
      '3ff8::',
      '3ffc::',
      // Outside global unicast altogether.
      '1000::1',
      '4000::1',
      '6000::1',
      '8000::1',
      'a000::1',
      'c000::1',
      'e000::1',
      'f800::1',
      // Unassigned gaps between allocated blocks (nothing routes there).
      '2001:1000::1',
      '2b00::1',
      '2420::1',
      '2a20::1',
      '2c10::1',
      '2cff::1',
    ])('blocks %s', (ip) => {
      expect(isBlockedAddress(ip)).toBe(true);
    });
  });

  describe('IPv6 public (allocated) addresses', () => {
    it.each([
      '2606:4700:4700::1111', // 2600::/12 ARIN
      '2606:4700:4700:0:0:0:0:1111', // expanded form
      '2606:4700:4700::1111%eth0', // zone id is ignored
      '2A00:1450:4001:81B::200E', // uppercase, 2a00::/12 RIPE
      '2a00:1450:4001:81b::200e',
      '2001:4860:4860::8888', // 2001:4800::/23 ARIN
      '2001:200::1', // first /23 after 2001::/23 (APNIC)
      '2001:3ff:ffff:ffff:ffff:ffff:ffff:ffff', // last address of 2001:200::/23
      '2001:400::1', // ARIN
      '2001:3000::1', // inside 2001:2000::/19 (RIPE, 2019 widening)
      '2001:db7:ffff::1', // just below documentation, inside 2001:c00::/23
      '2001:db9::1', // just above documentation
      '2620:4f:8001::1', // next /48 after the AS112 block
      '2620:100::1', // inside ARIN 2620::/23 (covers 2620:: - 2621:ffff::)
      '2003::1', // 2003::/18 RIPE
      '2400:cb00::1', // 2400::/12 APNIC
      '2410::1', // 2410::/12 APNIC, allocated 2024-11
      '2800::1', // LACNIC
      '2c00::1', // AFRINIC
      '2c0f:ffff::1', // last /16 of 2c00::/12
      '2a10::1', // 2a10::/12 RIPE (2019)
      '2a1f:ffff:ffff:ffff:ffff:ffff:ffff:ffff', // last address of 2a10::/12
      '2630::1', // 2630::/12 ARIN (2019)
      '2610::1',
      '2620::1',
    ])('allows %s', (ip) => {
      expect(isBlockedAddress(ip)).toBe(false);
    });
  });

  describe('transition mechanisms cannot smuggle blocked IPv4 destinations', () => {
    it.each([
      // IPv4-mapped / compatible / translated: never an honest DNS answer
      '::ffff:127.0.0.1',
      '::ffff:7f00:1',
      '::ffff:10.1.2.3',
      '::ffff:169.254.169.254',
      '::ffff:8.8.8.8', // public IPv4 inside a mapped address is still rejected
      '::ffff:0:8.8.8.8', // IPv4-translated (SIIT)
      '::127.0.0.1', // deprecated IPv4-compatible
      '::8.8.8.8',
      // NAT64 well-known prefix: judged by the embedded IPv4
      '64:ff9b::7f00:1', // 127.0.0.1
      '64:ff9b::a00:1', // 10.0.0.1
      '64:ff9b::c0a8:101', // 192.168.1.1
      '64:ff9b::a9fe:a9fe', // 169.254.169.254
      '64:ff9b::127.0.0.1', // dotted form
      '64:ff9b:1::808:808', // RFC 8215 local-use prefix: never public
      '64:ff9b:0:1::808:808', // not inside the /96
      // 6to4: judged by the IPv4 in bits 16..47
      '2002:7f00:1::1', // 127.0.0.1
      '2002:a00:1::1', // 10.0.0.1
      '2002:a9fe:a9fe::1', // 169.254.169.254
      '2002:c0a8:101::1', // 192.168.1.1
      '2002:ac10:1::1', // 172.16.0.1
    ])('blocks %s', (ip) => {
      expect(isBlockedAddress(ip)).toBe(true);
    });

    it.each([
      '64:ff9b::808:808', // NAT64 of 8.8.8.8 (legitimate on IPv6-only hosts)
      '64:ff9b::5db8:d822', // NAT64 of 93.184.216.34
      '2002:808:808::1', // 6to4 of 8.8.8.8
    ])('allows %s because the embedded IPv4 is public', (ip) => {
      expect(isBlockedAddress(ip)).toBe(false);
    });
  });

  it.each([
    'not-an-ip',
    '',
    ':::',
    '2001:db8::g',
    '1.2.3',
    '2606:4700:4700::1111::1',
    '12345::1',
  ])('fails closed on garbage %j', (ip) => {
    expect(isBlockedAddress(ip)).toBe(true);
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
    ['http://[3ffe::1]/', 'blocked'],
    ['http://[4000::1]/', 'blocked'],
    ['http://[2001:db8::1]/', 'blocked'],
    ['http://[::ffff:8.8.8.8]/', 'blocked'],
    ['http://[::ffff:127.0.0.1]/', 'blocked'],
    ['http://[64:ff9b::a00:1]/', 'blocked'],
    ['http://[2002:a00:1::1]/', 'blocked'],
    ['http://[fd00:ec2::254]/latest/meta-data', 'blocked'],
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
    [[{ address: '3ffe::1', family: 6 as const }]], // reserved 6bone space
    [[{ address: '::ffff:8.8.8.8', family: 6 as const }]], // mapped public v4
    [[{ address: '64:ff9b::a00:1', family: 6 as const }]], // NAT64 of 10.0.0.1
    [[{ address: '2002:a00:1::1', family: 6 as const }]], // 6to4 of 10.0.0.1
    [
      // public IPv6 + reserved IPv6 in one answer is still rejected
      [
        { address: '2606:4700:4700::1111', family: 6 as const },
        { address: '3ffe::1', family: 6 as const },
      ],
    ],
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

  it.each([
    ['2606:4700:4700::1111'],
    ['2a00:1450:4001:81b::200e'],
    ['64:ff9b::808:808'], // NAT64 of public 8.8.8.8 (IPv6-only hosts)
  ])('allows hostnames resolving to public IPv6 %s', async (address) => {
    const transport = jest.fn<
      ReturnType<HttpTransport>,
      Parameters<HttpTransport>
    >(() => Promise.resolve(html()));
    const { fetcher } = make(
      transport,
      jest.fn().mockResolvedValue([{ address, family: 6 as const }]),
    );
    await fetcher.fetchText('https://v6.example/job', 'text/html');
    expect(transport.mock.calls[0][0].address).toEqual({ address, family: 6 });
  });

  it('allows a public IPv6 literal URL and pins to it', async () => {
    const transport = jest.fn<
      ReturnType<HttpTransport>,
      Parameters<HttpTransport>
    >(() => Promise.resolve(html()));
    const { fetcher, lookup } = make(transport);
    await fetcher.fetchText('https://[2606:4700:4700::1111]/job', 'text/html');
    expect(lookup).not.toHaveBeenCalled(); // literals are not resolved
    expect(transport.mock.calls[0][0].address.address).toBe(
      '2606:4700:4700::1111',
    );
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

  it.each([
    'http://[3ffe::1]/',
    'http://[4000::1]/',
    'http://[::ffff:8.8.8.8]/',
    'http://[64:ff9b::a00:1]/',
    'http://[2002:7f00:1::1]/',
  ])('rejects a redirect to the non-public IPv6 literal %s', async (url) => {
    const transport = jest
      .fn()
      .mockResolvedValueOnce(respond(302, { location: url }));
    const { fetcher } = make(transport);
    await expect(
      fetcher.fetchText('https://example.com/a', 'text/html'),
    ).rejects.toMatchObject({ code: 'blocked' });
    expect(transport).toHaveBeenCalledTimes(1); // the redirect is never followed
  });

  it('rejects a redirect to a hostname that resolves to reserved IPv6 space', async () => {
    const lookup = jest
      .fn()
      .mockResolvedValueOnce(PUBLIC)
      .mockResolvedValueOnce([{ address: '3ffe::1', family: 6 }]);
    const transport = jest
      .fn()
      .mockResolvedValueOnce(
        respond(301, { location: 'https://6bone.example/admin' }),
      );
    const { fetcher } = make(transport, lookup);
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
