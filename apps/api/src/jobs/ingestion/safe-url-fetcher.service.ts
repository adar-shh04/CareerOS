import { promises as dns } from 'node:dns';
import * as http from 'node:http';
import * as https from 'node:https';
import { isIP } from 'node:net';

import { Inject, Injectable, Optional } from '@nestjs/common';

import { isBlockedAddress } from './ip-guard';

export const URL_FETCH_MAX_BYTES = 2 * 1024 * 1024;
export const URL_FETCH_TIMEOUT_MS = 8_000;
export const URL_FETCH_MAX_REDIRECTS = 3;
export const URL_FETCH_MAX_URL_LENGTH = 2000;
/** Plain, identifying, carries no user data. */
export const URL_FETCH_USER_AGENT =
  'CareerOS-JobImporter/1.0 (public job posting import)';

const ALLOWED_CONTENT_TYPES = new Set([
  'text/html',
  'application/xhtml+xml',
  'application/json',
  'application/ld+json',
]);

export type UrlFetchErrorCode =
  | 'invalid_url'
  | 'blocked'
  | 'dns'
  | 'timeout'
  | 'too_large'
  | 'bad_content_type'
  | 'http_status'
  | 'too_many_redirects'
  | 'network';

export class UrlFetchError extends Error {
  constructor(
    readonly code: UrlFetchErrorCode,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'UrlFetchError';
  }
}

export interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

/** Injectable DNS layer (mocked in tests). */
export type DnsLookup = (hostname: string) => Promise<ResolvedAddress[]>;

export interface TransportRequest {
  url: URL;
  /** The already-validated address the connection MUST be made to. */
  address: ResolvedAddress;
  headers: Record<string, string>;
  signal: AbortSignal;
}

export interface TransportResponse {
  status: number;
  /** Lower-cased header names. */
  headers: Record<string, string | undefined>;
  body: AsyncIterable<Uint8Array>;
  destroy: () => void;
}

/** Injectable HTTP layer (mocked in tests). Must not follow redirects. */
export type HttpTransport = (
  request: TransportRequest,
) => Promise<TransportResponse>;

export interface UrlFetchDeps {
  lookup?: DnsLookup;
  transport?: HttpTransport;
  timeoutMs?: number;
  maxBytes?: number;
}

export const URL_FETCH_DEPS = Symbol('URL_FETCH_DEPS');

export interface FetchedText {
  finalUrl: URL;
  status: number;
  contentType: string;
  text: string;
}

const defaultLookup: DnsLookup = async (hostname) => {
  const results = await dns.lookup(hostname, { all: true, verbatim: true });
  return results.map((r) => ({
    address: r.address,
    family: r.family === 6 ? 6 : 4,
  }));
};

/**
 * Real transport: node http(s) with the socket pinned to the validated IP
 * (custom `lookup`), so a DNS rebind between validation and connect cannot
 * redirect the request. TLS SNI/Host still use the original hostname.
 * No redirects, no decompression, no cookies.
 */
const defaultTransport: HttpTransport = (request) =>
  new Promise<TransportResponse>((resolve, reject) => {
    const { url, address, headers, signal } = request;
    const client = url.protocol === 'https:' ? https : http;
    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    const req = client.request(
      {
        protocol: url.protocol,
        hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        headers,
        agent: false,
        signal,
        lookup: (_host, options, callback) => {
          const cb = callback as unknown as (
            err: Error | null,
            addressOrList: unknown,
            family?: number,
          ) => void;
          if ((options as { all?: boolean }).all) {
            cb(null, [{ address: address.address, family: address.family }]);
          } else {
            cb(null, address.address, address.family);
          }
        },
      },
      (res) => {
        const responseHeaders: Record<string, string | undefined> = {};
        for (const [name, value] of Object.entries(res.headers)) {
          responseHeaders[name.toLowerCase()] = Array.isArray(value)
            ? value[0]
            : value;
        }
        resolve({
          status: res.statusCode ?? 0,
          headers: responseHeaders,
          body: res,
          destroy: () => {
            res.destroy();
            req.destroy();
          },
        });
      },
    );
    req.on('error', reject);
    req.end();
  });

/**
 * SSRF-safe fetcher for public pages. Every hop (initial request and each
 * redirect, max 3) is validated: http/https only, no credentials, ports 80/443
 * only, DNS resolved and EVERY returned address must be public; the connection
 * is then pinned to the validated IP. Overall deadline, 2 MB streaming cap,
 * content-type allow-list, no cookies/auth forwarded.
 */
@Injectable()
export class SafeUrlFetcherService {
  private readonly lookup: DnsLookup;
  private readonly transport: HttpTransport;
  private readonly timeoutMs: number;
  private readonly maxBytes: number;

  constructor(@Optional() @Inject(URL_FETCH_DEPS) deps?: UrlFetchDeps) {
    this.lookup = deps?.lookup ?? defaultLookup;
    this.transport = deps?.transport ?? defaultTransport;
    this.timeoutMs = deps?.timeoutMs ?? URL_FETCH_TIMEOUT_MS;
    this.maxBytes = deps?.maxBytes ?? URL_FETCH_MAX_BYTES;
  }

  /** Throws UrlFetchError('invalid_url' | 'blocked') for unsafe URLs. */
  parseAndValidateUrl(raw: string): URL {
    if (raw.length > URL_FETCH_MAX_URL_LENGTH) {
      throw new UrlFetchError('invalid_url', 'The URL is too long.');
    }
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new UrlFetchError('invalid_url', 'That is not a valid URL.');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new UrlFetchError(
        'invalid_url',
        'Only http and https URLs can be imported.',
      );
    }
    if (url.username || url.password) {
      throw new UrlFetchError(
        'invalid_url',
        'URLs with embedded credentials are not allowed.',
      );
    }
    if (url.port !== '' && url.port !== '80' && url.port !== '443') {
      throw new UrlFetchError(
        'blocked',
        'Only the standard web ports (80 and 443) can be imported.',
      );
    }
    if (!url.hostname) {
      throw new UrlFetchError('invalid_url', 'That is not a valid URL.');
    }
    return url;
  }

  private async resolvePublicAddress(url: URL): Promise<ResolvedAddress> {
    const host = url.hostname.replace(/^\[|\]$/g, '');
    const lower = host.toLowerCase();
    if (
      lower === 'localhost' ||
      lower.endsWith('.localhost') ||
      lower.endsWith('.internal') ||
      lower.endsWith('.local')
    ) {
      throw new UrlFetchError('blocked', blockedMessage());
    }
    const literal = isIP(host);
    let addresses: ResolvedAddress[];
    if (literal) {
      addresses = [{ address: host, family: literal === 6 ? 6 : 4 }];
    } else {
      try {
        addresses = await this.lookup(host);
      } catch {
        throw new UrlFetchError('dns', `Could not find the host "${host}".`);
      }
    }
    if (addresses.length === 0) {
      throw new UrlFetchError('dns', `Could not find the host "${host}".`);
    }
    // Reject if ANY answer is non-public: a mixed answer is a rebinding tell.
    if (addresses.some((a) => isBlockedAddress(a.address))) {
      throw new UrlFetchError('blocked', blockedMessage());
    }
    return addresses[0];
  }

  async fetchText(rawUrl: string, accept: string): Promise<FetchedText> {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);
    const { signal } = controller;
    try {
      let current = this.parseAndValidateUrl(rawUrl);
      for (let hop = 0; hop <= URL_FETCH_MAX_REDIRECTS; hop++) {
        const address = await abortable(
          this.resolvePublicAddress(current),
          signal,
        );
        const response = await abortable(
          this.transport({
            url: current,
            address,
            signal,
            headers: {
              'User-Agent': URL_FETCH_USER_AGENT,
              Accept: accept,
              'Accept-Encoding': 'identity',
              Connection: 'close',
            },
          }),
          signal,
        );

        if (response.status >= 300 && response.status < 400) {
          response.destroy();
          const location = response.headers.location;
          if (!location) {
            throw new UrlFetchError(
              'http_status',
              'The page redirected without a destination.',
              response.status,
            );
          }
          if (hop === URL_FETCH_MAX_REDIRECTS) {
            throw new UrlFetchError(
              'too_many_redirects',
              'The page redirected too many times.',
            );
          }
          let next: URL;
          try {
            next = new URL(location, current);
          } catch {
            throw new UrlFetchError(
              'http_status',
              'The page redirected to an invalid address.',
              response.status,
            );
          }
          // Re-validated (scheme, port, DNS, address) at the top of the loop.
          current = this.parseAndValidateUrl(next.toString());
          continue;
        }

        if (response.status < 200 || response.status >= 300) {
          response.destroy();
          throw new UrlFetchError(
            'http_status',
            `The site answered with HTTP ${String(response.status)}.`,
            response.status,
          );
        }

        const contentType = (response.headers['content-type'] ?? '')
          .split(';')[0]
          .trim()
          .toLowerCase();
        if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
          response.destroy();
          throw new UrlFetchError(
            'bad_content_type',
            'The URL did not return a web page or JSON document.',
          );
        }
        const declared = Number(response.headers['content-length']);
        if (Number.isFinite(declared) && declared > this.maxBytes) {
          response.destroy();
          throw new UrlFetchError('too_large', 'The page is too large.');
        }

        const text = await this.readBody(response, signal);
        return {
          finalUrl: current,
          status: response.status,
          contentType,
          text,
        };
      }
      throw new UrlFetchError(
        'too_many_redirects',
        'The page redirected too many times.',
      );
    } catch (error) {
      if (error instanceof UrlFetchError) throw error;
      if (signal.aborted) {
        throw new UrlFetchError(
          'timeout',
          'The site took too long to respond.',
        );
      }
      throw new UrlFetchError('network', 'Could not reach that site.');
    } finally {
      clearTimeout(timer);
    }
  }

  private async readBody(
    response: TransportResponse,
    signal: AbortSignal,
  ): Promise<string> {
    const chunks: Uint8Array[] = [];
    let total = 0;
    const iterator = response.body[Symbol.asyncIterator]();
    try {
      for (;;) {
        const next = await abortable(iterator.next(), signal);
        if (next.done) break;
        total += next.value.byteLength;
        if (total > this.maxBytes) {
          throw new UrlFetchError('too_large', 'The page is too large.');
        }
        chunks.push(next.value);
      }
    } catch (error) {
      response.destroy();
      throw error;
    }
    return new TextDecoder('utf-8').decode(Buffer.concat(chunks));
  }
}

function blockedMessage(): string {
  return 'That address is not a public web page and cannot be imported.';
}

/** Rejects as soon as the signal aborts, whatever the wrapped promise does. */
function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(new Error('aborted'));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      reject(new Error('aborted'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
    Promise.resolve(promise).then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}
