import {
  BadRequestException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';

import {
  extractFromHtml,
  greenhouseApiUrl,
  type JobUrlDraft,
  leverApiUrl,
  mapGreenhouse,
  mapLever,
  parseGreenhouseUrl,
  parseLeverUrl,
} from './job-url-extractors';
import {
  SafeUrlFetcherService,
  UrlFetchError,
} from './safe-url-fetcher.service';

const PASTE_HINT = 'Please paste the job description into the form instead.';
const HTML_ACCEPT = 'text/html,application/xhtml+xml;q=0.9';
const JSON_ACCEPT = 'application/json';

function isLinkedIn(host: string): boolean {
  return /(^|\.)linkedin\.com$/i.test(host);
}

/**
 * Builds DRAFT job fields from a public posting URL. Never persists anything;
 * the Add Job dialog reviews the draft and submits it through the normal
 * POST /jobs flow (normalisation + duplicate detection live there).
 *
 * Order: Greenhouse API, Lever API, then schema.org JobPosting JSON-LD.
 * No login bypass: pages that need a login yield a clear 422.
 */
@Injectable()
export class JobUrlScraperService {
  constructor(private readonly fetcher: SafeUrlFetcherService) {}

  async importFromUrl(rawUrl: string): Promise<JobUrlDraft> {
    let url: URL;
    try {
      url = this.fetcher.parseAndValidateUrl(rawUrl);
    } catch (error) {
      throw this.toHttpError(error);
    }
    url.hash = '';
    const sourceUrl = url.toString();

    // 1 + 2: public ATS APIs. A failure here (e.g. closed posting) falls
    // through to the generic page, except for blocked/unsafe targets.
    const viaApi = await this.tryAtsApi(url, sourceUrl);
    if (viaApi) return viaApi;

    // 3: generic JSON-LD
    let html: string;
    try {
      const page = await this.fetcher.fetchText(sourceUrl, HTML_ACCEPT);
      if (
        page.contentType === 'application/json' ||
        page.contentType === 'application/ld+json'
      ) {
        html = `<script type="application/ld+json">${page.text}</script>`;
      } else {
        html = page.text;
      }
    } catch (error) {
      throw this.toHttpError(error, url);
    }
    const draft = extractFromHtml(html, sourceUrl, url.hostname);
    if (!draft) {
      throw new UnprocessableEntityException(
        isLinkedIn(url.hostname)
          ? `LinkedIn requires a login to show this job, so it cannot be imported automatically. ${PASTE_HINT}`
          : `No structured job posting was found on that page (it may need a login or load its content with JavaScript). ${PASTE_HINT}`,
      );
    }
    return draft;
  }

  private async tryAtsApi(
    url: URL,
    sourceUrl: string,
  ): Promise<JobUrlDraft | null> {
    const greenhouse = parseGreenhouseUrl(url);
    const lever = greenhouse ? null : parseLeverUrl(url);
    if (!greenhouse && !lever) return null;
    try {
      const apiUrl = greenhouse
        ? greenhouseApiUrl(greenhouse)
        : lever
          ? leverApiUrl(lever)
          : '';
      const page = await this.fetcher.fetchText(apiUrl, JSON_ACCEPT);
      const payload: unknown = JSON.parse(page.text);
      if (greenhouse) return mapGreenhouse(payload, greenhouse, sourceUrl);
      return lever ? mapLever(payload, lever, sourceUrl) : null;
    } catch (error) {
      if (error instanceof UrlFetchError && error.code === 'blocked') {
        throw this.toHttpError(error);
      }
      return null; // fall back to the generic page
    }
  }

  private toHttpError(error: unknown, url?: URL): Error {
    if (!(error instanceof UrlFetchError)) {
      return new UnprocessableEntityException(
        `The job page could not be read. ${PASTE_HINT}`,
      );
    }
    if (error.code === 'invalid_url' || error.code === 'blocked') {
      return new BadRequestException(error.message);
    }
    if (
      url &&
      isLinkedIn(url.hostname) &&
      (error.status === 999 || error.status === 401 || error.status === 403)
    ) {
      return new UnprocessableEntityException(
        `LinkedIn requires a login to show this job, so it cannot be imported automatically. ${PASTE_HINT}`,
      );
    }
    return new UnprocessableEntityException(`${error.message} ${PASTE_HINT}`);
  }
}
