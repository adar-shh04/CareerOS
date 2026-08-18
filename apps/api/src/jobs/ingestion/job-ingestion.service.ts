import { Injectable, Logger } from '@nestjs/common';

import type { CanonicalJob } from '../jobs.types';
import { PrismaJobsRepository } from '../prisma-jobs.repository';
import { ApifyLinkedInAdapter } from './apify-linkedin.adapter';
import { JobDeduplicationService } from './job-deduplication.service';
import { JobNormalizationService } from './job-normalization.service';
import type { JobSourceAdapter } from './job-source-adapter.interface';

export interface IngestionOptions {
  source?: string;
  query: string;
  location?: string;
  limit?: number;
  apiKey?: string;
}

export interface IngestionResult {
  source: string;
  fetchedCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  canonicalJobs: CanonicalJob[];
}

@Injectable()
export class JobIngestionService {
  private readonly logger = new Logger(JobIngestionService.name);
  private readonly adapters = new Map<string, JobSourceAdapter>();

  constructor(
    private readonly apifyAdapter: ApifyLinkedInAdapter,
    private readonly normalizationService: JobNormalizationService,
    private readonly deduplicationService: JobDeduplicationService,
    private readonly repository: PrismaJobsRepository,
  ) {
    this.adapters.set(apifyAdapter.sourceId, apifyAdapter);
  }

  async ingest(options: IngestionOptions): Promise<IngestionResult> {
    const sourceId = options.source ?? this.apifyAdapter.sourceId;
    const adapter = this.adapters.get(sourceId) ?? this.apifyAdapter;

    this.logger.log(
      `Starting job ingestion via adapter '${adapter.sourceId}' for query '${options.query}' (location: ${options.location ?? 'any'})`,
    );

    const rawJobs = await adapter.fetchJobs({
      query: options.query,
      location: options.location,
      limit: options.limit ?? 20,
      apiKey: options.apiKey,
    });

    this.logger.log(
      `Fetched ${String(rawJobs.length)} raw jobs from ${adapter.sourceId}.`,
    );

    let createdCount = 0;
    let updatedCount = 0;
    const skippedCount = 0;
    const canonicalJobs: CanonicalJob[] = [];

    for (const raw of rawJobs) {
      const normalizedInput = this.normalizationService.normalize(raw);
      const fingerprint =
        this.deduplicationService.computeFingerprint(normalizedInput);

      // Check if job already exists by (source, externalId) or fingerprint
      const existing = await this.repository.findJobBySourceOrFingerprint(
        normalizedInput.source ?? adapter.sourceId,
        normalizedInput.externalId,
        fingerprint,
      );

      if (existing) {
        const updated = await this.repository.upsertCanonicalJob({
          ...normalizedInput,
          fingerprint,
          externalId: existing.externalId ?? normalizedInput.externalId,
        });
        updatedCount++;
        canonicalJobs.push(updated);
      } else {
        const created = await this.repository.upsertCanonicalJob({
          ...normalizedInput,
          fingerprint,
        });
        createdCount++;
        canonicalJobs.push(created);
      }
    }

    this.logger.log(
      `Ingestion completed for '${adapter.sourceId}': ` +
        `Fetched: ${String(rawJobs.length)}, Created: ${String(createdCount)}, Updated: ${String(updatedCount)}, Skipped: ${String(skippedCount)}`,
    );

    return {
      source: adapter.sourceId,
      fetchedCount: rawJobs.length,
      createdCount,
      updatedCount,
      skippedCount,
      canonicalJobs,
    };
  }
}
