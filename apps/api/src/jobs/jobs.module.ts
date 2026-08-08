import { Module } from '@nestjs/common';

import { CareerProfileModule } from '../career-profile/career-profile.module';
import { PrismaService } from '../database/prisma.service';
import { ResumeProfileModule } from '../resume-profile/resume-profile.module';
import { ApifyLinkedInAdapter } from './ingestion/apify-linkedin.adapter';
import { JobDeduplicationService } from './ingestion/job-deduplication.service';
import { JobIngestionService } from './ingestion/job-ingestion.service';
import { JobNormalizationService } from './ingestion/job-normalization.service';
import { JobMatchingService } from './job-matching.service';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { PrismaJobsRepository } from './prisma-jobs.repository';

@Module({
  imports: [CareerProfileModule, ResumeProfileModule],
  controllers: [JobsController],
  providers: [
    PrismaService,
    PrismaJobsRepository,
    JobMatchingService,
    JobNormalizationService,
    JobDeduplicationService,
    ApifyLinkedInAdapter,
    JobIngestionService,
    JobsService,
  ],
  exports: [JobsService, JobMatchingService, JobIngestionService],
})
export class JobsModule {}
