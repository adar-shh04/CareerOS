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

  /**
   * Fingerprint for a private (workspace-owned) job. Salted with the owner so
   * it can never collide with, or overwrite, a shared catalog job or another
   * workspace's job, while re-adding the same job in one workspace still
   * resolves to the same row.
   */
  computeOwnedFingerprint(
    job: CreateJobInput,
    ownerOrganizationId: string,
    discriminator = '',
  ): string {
    return createHash('sha256')
      .update(
        `${this.computeFingerprint(job)}|owner:${ownerOrganizationId}|${discriminator}`,
      )
      .digest('hex');
  }

  /** Stable hash of free text (used to tell apart postings with no location). */
  hashText(text: string): string {
    return createHash('sha256').update(this.clean(text)).digest('hex');
  }

  /**
   * Canonical form of a posting URL so the same posting pasted with different
   * tracking parameters / fragments / trailing slash compares equal.
   * Returns undefined for anything that is not a valid http(s) URL.
   */
  normalizeSourceUrl(url: string | undefined): string | undefined {
    if (!url) return undefined;
    let parsed: URL;
    try {
      parsed = new URL(url.trim());
    } catch {
      return undefined;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return undefined;
    }
    parsed.hash = '';
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(utm_|trk|tracking|refid$|ref$|src$|source$|gh_src$)/i.test(key)) {
        parsed.searchParams.delete(key);
      }
    }
    const path = parsed.pathname.replace(/\/+$/, '') || '/';
    const search = parsed.searchParams.toString();
    return `${parsed.protocol}//${parsed.host.toLowerCase()}${path}${search ? `?${search}` : ''}`;
  }

  private clean(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }
}
