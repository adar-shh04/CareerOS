import { Module } from '@nestjs/common';

import { CareerProfileModule } from '../career-profile/career-profile.module';
import { PrismaService } from '../database/prisma.service';
import { PrismaResumeProfileRepository } from './prisma-resume-profile.repository';
import { ResumeProfileController } from './resume-profile.controller';
import { RESUME_PROFILE_REPOSITORY } from './resume-profile.repository';
import { ResumeProfileService } from './resume-profile.service';

@Module({
  imports: [CareerProfileModule],
  controllers: [ResumeProfileController],
  providers: [
    PrismaService,
    PrismaResumeProfileRepository,
    {
      provide: RESUME_PROFILE_REPOSITORY,
      useExisting: PrismaResumeProfileRepository,
    },
    ResumeProfileService,
  ],
  exports: [ResumeProfileService],
})
export class ResumeProfileModule {}
