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

  it('should treat whitespace, special characters, and casing variations as identical fingerprints', () => {
    const job1: CreateJobInput = {
      company: 'Google LLC',
      title: 'Staff   Backend   Engineer',
      location: 'New York, NY',
    };

    const job2: CreateJobInput = {
      company: ' google  llc ',
      title: 'staff backend engineer',
      location: 'new york ny',
    };

    expect(service.computeFingerprint(job1)).toBe(
      service.computeFingerprint(job2),
    );
  });

  it('should generate different fingerprints for different companies', () => {
    const job1: CreateJobInput = {
      company: 'Apple',
      title: 'Software Engineer',
      location: 'Cupertino, CA',
    };

    const job2: CreateJobInput = {
      company: 'Google',
      title: 'Software Engineer',
      location: 'Cupertino, CA',
    };

    expect(service.computeFingerprint(job1)).not.toBe(
      service.computeFingerprint(job2),
    );
  });

  it('should generate different fingerprints for same company and title in different locations', () => {
    const job1: CreateJobInput = {
      company: 'Meta',
      title: 'Product Designer',
      location: 'Menlo Park, CA',
    };

    const job2: CreateJobInput = {
      company: 'Meta',
      title: 'Product Designer',
      location: 'London, UK',
    };

    expect(service.computeFingerprint(job1)).not.toBe(
      service.computeFingerprint(job2),
    );
  });

  it('should generate different fingerprints for slightly different titles (intentional conservative dedup)', () => {
    const job1: CreateJobInput = {
      company: 'Amazon',
      title: 'Sr. Software Development Engineer',
      location: 'Seattle, WA',
    };

    const job2: CreateJobInput = {
      company: 'Amazon',
      title: 'Senior Software Development Engineer',
      location: 'Seattle, WA',
    };

    expect(service.computeFingerprint(job1)).not.toBe(
      service.computeFingerprint(job2),
    );
  });
});
