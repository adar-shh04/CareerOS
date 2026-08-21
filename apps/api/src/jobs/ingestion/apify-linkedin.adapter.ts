import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';

import type {
  FetchJobsParams,
  JobSourceAdapter,
  RawIngestedJob,
} from './job-source-adapter.interface';

interface ApifyLinkedInItem {
  id?: string;
  jobId?: string;
  title?: string;
  companyName?: string;
  company?: string;
  location?: string;
  link?: string;
  url?: string;
  description?: string;
  salary?: string;
  postedAt?: string;
  publishedAt?: string;
  isRemote?: boolean;
  workType?: string;
  skills?: string[];
}

export class ApifyConfigurationError extends BadRequestException {
  constructor(
    message = 'Apify API token is not configured. Set the APIFY_API_TOKEN environment variable or provide an apiKey in the request.',
  ) {
    super(message);
  }
}

export class ApifyIngestionError extends BadGatewayException {}

@Injectable()
export class ApifyLinkedInAdapter implements JobSourceAdapter {
  readonly sourceId = 'linkedin-apify';
  private readonly logger = new Logger(ApifyLinkedInAdapter.name);

  async fetchJobs(params: FetchJobsParams): Promise<RawIngestedJob[]> {
    const apiToken = params.apiKey ?? process.env.APIFY_API_TOKEN;

    if (!apiToken) {
      this.logger.warn('Apify API token is not configured.');
      throw new ApifyConfigurationError();
    }

    try {
      return await this.fetchFromApifyApi(params, apiToken);
    } catch (error: unknown) {
      if (
        error instanceof ApifyConfigurationError ||
        error instanceof ApifyIngestionError
      ) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Apify API fetch failed: ${message}`);
      throw new ApifyIngestionError(
        `Failed to fetch jobs from Apify: ${message}`,
      );
    }
  }

  private async fetchFromApifyApi(
    params: FetchJobsParams,
    apiToken: string,
  ): Promise<RawIngestedJob[]> {
    const url = `https://api.apify.com/v2/acts/apify~linkedin-jobs-scraper/run-sync-get-dataset-items?token=${apiToken}`;
    const payload = {
      title: params.query,
      location: params.location ?? 'Remote',
      rows: params.limit ?? 20,
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (fetchError: unknown) {
      const msg =
        fetchError instanceof Error ? fetchError.message : 'Network error';
      throw new ApifyIngestionError(
        `Network error while calling Apify API: ${msg}`,
      );
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new ApifyIngestionError(
        `Apify API responded with HTTP status ${String(response.status)}${errorText ? `: ${errorText.slice(0, 200)}` : ''}`,
      );
    }

    let items: unknown;
    try {
      items = await response.json();
    } catch {
      throw new ApifyIngestionError(
        'Invalid JSON output received from Apify actor',
      );
    }

    if (!Array.isArray(items)) {
      throw new ApifyIngestionError(
        'Invalid dataset format received from Apify actor: expected an array',
      );
    }

    return (items as ApifyLinkedInItem[])
      .filter((item) =>
        Boolean(item.title && (item.companyName ?? item.company)),
      )
      .map((item, index) => this.mapApifyItemToRawJob(item, index));
  }

  private mapApifyItemToRawJob(
    item: ApifyLinkedInItem,
    index: number,
  ): RawIngestedJob {
    const externalId =
      item.id ??
      item.jobId ??
      `apify-li-${String(Date.now())}-${String(index)}`;
    const company = item.companyName ?? item.company ?? 'Unknown Company';
    const title = item.title ?? 'Software Engineer';
    const location = item.location ?? 'Remote';
    const sourceUrl = item.link ?? item.url ?? undefined;
    const description = item.description ?? `${title} position at ${company}.`;

    const isRemote =
      item.isRemote === true ||
      item.workType?.toLowerCase().includes('remote') === true ||
      location.toLowerCase().includes('remote');

    return {
      externalId,
      source: this.sourceId,
      sourceUrl,
      company,
      title,
      location,
      description,
      salaryText: item.salary,
      postedAtText: item.postedAt ?? item.publishedAt,
      isRemote,
      rawSkills: item.skills,
      rawData: item as unknown as Record<string, unknown>,
    };
  }
}
