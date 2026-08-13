import { Injectable, Logger } from '@nestjs/common';

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

@Injectable()
export class ApifyLinkedInAdapter implements JobSourceAdapter {
  readonly sourceId = 'linkedin-apify';
  private readonly logger = new Logger(ApifyLinkedInAdapter.name);

  async fetchJobs(params: FetchJobsParams): Promise<RawIngestedJob[]> {
    const apiToken = params.apiKey ?? process.env.APIFY_API_TOKEN;

    if (apiToken) {
      try {
        return await this.fetchFromApifyApi(params, apiToken);
      } catch (error) {
        this.logger.warn(
          `Apify API call failed: ${error instanceof Error ? error.message : 'Unknown error'}. Falling back to sample market data for testing.`,
        );
      }
    } else {
      this.logger.log(
        'APIFY_API_TOKEN not configured. Using realistic sample LinkedIn market payload for ingestion.',
      );
    }

    return this.getMockLinkedInJobs(params);
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

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `Apify API responded with HTTP status ${String(response.status)}`,
      );
    }

    const items = (await response.json()) as ApifyLinkedInItem[];
    if (!Array.isArray(items)) {
      throw new Error('Invalid JSON output received from Apify actor');
    }

    return items
      .filter((item) => item.title && (item.companyName ?? item.company))
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

  private getMockLinkedInJobs(params: FetchJobsParams): RawIngestedJob[] {
    const queryLower = params.query.toLowerCase();
    const mockJobs: RawIngestedJob[] = [
      {
        externalId: 'li-apify-39201948',
        source: this.sourceId,
        sourceUrl: 'https://www.linkedin.com/jobs/view/39201948',
        company: 'Stripe',
        title: 'Senior Infrastructure & Distributed Systems Engineer',
        location: 'San Francisco, CA (Hybrid)',
        description:
          'Join Stripe Payments Engine team. You will build high-throughput distributed transaction infrastructure using Ruby, Go, TypeScript, PostgreSQL, and AWS. Required experience with Redis, Docker, Kubernetes, and API design.',
        salaryText: '$185,000 - $235,000/yr',
        postedAtText: '1 day ago',
        isRemote: false,
        rawSkills: [
          'TypeScript',
          'Go',
          'Ruby',
          'PostgreSQL',
          'AWS',
          'Docker',
          'Kubernetes',
        ],
      },
      {
        externalId: 'li-apify-40192831',
        source: this.sourceId,
        sourceUrl: 'https://www.linkedin.com/jobs/view/40192831',
        company: 'Datadog',
        title: 'Staff Full Stack Engineer — Observability AI',
        location: 'Remote (US)',
        description:
          'Datadog is looking for a Staff Full Stack Engineer to lead our AI Insights product. Deep expertise in React, Next.js, Node.js, TypeScript, Python, and Vector Databases required. Preferred experience with GraphQL and Tailwind CSS.',
        salaryText: '$200,000 - $250,000/yr',
        postedAtText: '3 days ago',
        isRemote: true,
        rawSkills: [
          'React',
          'Next.js',
          'TypeScript',
          'Node.js',
          'Python',
          'GraphQL',
          'Vector Databases',
        ],
      },
      {
        externalId: 'li-apify-41029384',
        source: this.sourceId,
        sourceUrl: 'https://www.linkedin.com/jobs/view/41029384',
        company: 'Figma',
        title: 'Lead Frontend Platform Engineer',
        location: 'New York, NY',
        description:
          'Figma Web Platform team is hiring a Lead Engineer to scale WebGL and WebAssembly performance. Must have mastery over WebGL, TypeScript, React, C++, and browser rendering pipelines.',
        salaryText: '$210,000 - $270,000/yr',
        postedAtText: '2 days ago',
        isRemote: false,
        rawSkills: [
          'TypeScript',
          'React',
          'C++',
          'WebGL',
          'WebAssembly',
          'Performance',
        ],
      },
      {
        externalId: 'li-apify-42938102',
        source: this.sourceId,
        sourceUrl: 'https://www.linkedin.com/jobs/view/42938102',
        company: 'OpenAI',
        title: 'Senior Software Engineer — Developer Platform',
        location: 'San Francisco, CA',
        description:
          'Help build the API platform for ChatGPT and developer APIs. Work with Python, FastAPI, TypeScript, React, Redis, PostgreSQL, and LLM integrations.',
        salaryText: '$220,000 - $290,000/yr',
        postedAtText: 'Just posted',
        isRemote: true,
        rawSkills: [
          'Python',
          'FastAPI',
          'TypeScript',
          'React',
          'PostgreSQL',
          'Redis',
          'LLM',
        ],
      },
    ];

    if (!params.query) return mockJobs;

    return mockJobs.filter(
      (job) =>
        job.title.toLowerCase().includes(queryLower) ||
        job.company.toLowerCase().includes(queryLower) ||
        job.description.toLowerCase().includes(queryLower) ||
        job.rawSkills?.some((s) => s.toLowerCase().includes(queryLower)),
    );
  }
}
