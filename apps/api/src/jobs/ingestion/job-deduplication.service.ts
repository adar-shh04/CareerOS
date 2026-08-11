import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

import type { CreateJobInput } from '../jobs.types';

@Injectable()
export class JobDeduplicationService {
  /**
   * Generates a deterministic SHA-256 fingerprint hash for a job based on its core identity
   * attributes (company, title, location).
   */
  computeFingerprint(job: CreateJobInput): string {
    const raw = `${this.clean(job.company)}|${this.clean(job.title)}|${this.clean(job.location)}`;
    return createHash('sha256').update(raw).digest('hex');
  }

  private clean(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }
}
