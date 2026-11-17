import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import type { CanonicalJob } from '../jobs.types';
import { PrismaJobsRepository } from '../prisma-jobs.repository';
import { ApifyLinkedInAdapter } from './apify-linkedin.adapter';
import { JobDeduplicationService } from './job-deduplication.service';
import { JobNormalizationService } from './job-normalization.service';
import type {
  JobSourceAdapter,
  RawIngestedJob,
} from './job-source-adapter.interface';

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

  registerAdapter(adapter: JobSourceAdapter): void {
    this.adapters.set(adapter.sourceId, adapter);
  }

  /**
   * Add one user-supplied job as a private job of `ownerOrganizationId`,
   * unless the same posting is already visible to that workspace.
   *
   * A posting is a duplicate when, among the jobs this workspace can see
   * (shared catalog + its own), one has the same canonical source URL, or the
   * same company + title + location. When no location was given, only a posting
   * with an identical description counts (company + title alone would wrongly
   * merge distinct openings). A duplicate is returned untouched: it is never
   * updated or re-created, so the user's saved/applied history stays intact.
   *
   * Reuses the normalization pipeline (skills, seniority, salary, remote
   * policy) but not an adapter. No externalId, so the global (source,
   * externalId) key can't collide; the owner-salted fingerprint keeps private
   * jobs apart from shared ones and from other workspaces.
   */
  async ingestManual(
    raw: Omit<RawIngestedJob, 'externalId' | 'source'>,
    ownerOrganizationId: string,
  ): Promise<{ job: CanonicalJob; created: boolean }> {
    const hasLocation = raw.location.trim().length > 0;
    const sourceUrl = this.deduplicationService.normalizeSourceUrl(
      raw.sourceUrl,
    );
    const normalized = this.normalizationService.normalize({
      ...raw,
      location: hasLocation ? raw.location : 'Not specified',
      sourceUrl,
      externalId: '',
      source: 'manual',
    });
    const input = {
      ...normalized,
      externalId: undefined,
      ownerOrganizationId,
    };
    const discriminator = hasLocation
      ? ''
      : this.deduplicationService.hashText(normalized.description ?? '');
    const ownedFingerprint = this.deduplicationService.computeOwnedFingerprint(
      input,
      ownerOrganizationId,
      discriminator,
    );
    // A shared-catalog twin is only comparable when a real location was given.
    const sharedFingerprint = hasLocation
      ? this.deduplicationService.computeFingerprint(input)
      : undefined;

    const existing = await this.repository.findVisibleDuplicate(
      ownerOrganizationId,
      {
        sourceUrl,
        fingerprints: [ownedFingerprint, sharedFingerprint].filter(
          (f): f is string => f !== undefined,
        ),
      },
    );
    if (existing) return { job: existing, created: false };

    const job = await this.repository.upsertCanonicalJob({
      ...input,
      fingerprint: ownedFingerprint,
    });
    return { job, created: true };
  }

  async ingest(options: IngestionOptions): Promise<IngestionResult> {
    const sourceId = options.source ?? this.apifyAdapter.sourceId;
    const adapter = this.adapters.get(sourceId);

    if (!adapter) {
      throw new BadRequestException(
        `Job source adapter '${sourceId}' is not registered.`,
      );
    }

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
