import type { CreateJobInput } from '../jobs.types';
import { JobDeduplicationService } from './job-deduplication.service';

describe('JobDeduplicationService', () => {
  let service: JobDeduplicationService;

  beforeEach(() => {
    service = new JobDeduplicationService();
  });

  it('should compute consistent SHA-256 fingerprint regardless of casing or formatting', () => {
    const job1: CreateJobInput = {
      company: 'Stripe, Inc.',
      title: 'Senior Software Engineer',
      location: 'San Francisco, CA',
    };

    const job2: CreateJobInput = {
      company: 'stripe inc',
      title: 'Senior Software Engineer',
      location: 'san francisco ca',
    };

    const fp1 = service.computeFingerprint(job1);
    const fp2 = service.computeFingerprint(job2);

    expect(fp1).toBeDefined();
    expect(fp1.length).toBe(64); // SHA-256 hex digest
    expect(fp1).toBe(fp2);
  });
});
