import { Module } from '@nestjs/common';

import { ByokModule } from '../byok/byok.module';
import { CareerProfileModule } from '../career-profile/career-profile.module';
import { PrismaService } from '../database/prisma.service';
import { PrismaResumeProfileRepository } from './prisma-resume-profile.repository';
import { ResumeParserService } from './resume-parser.service';
import { ResumeProfileController } from './resume-profile.controller';
import { RESUME_PROFILE_REPOSITORY } from './resume-profile.repository';
import { ResumeProfileService } from './resume-profile.service';

@Module({
  imports: [CareerProfileModule, ByokModule],
  controllers: [ResumeProfileController],
  providers: [
    PrismaService,
    PrismaResumeProfileRepository,
    {
      provide: RESUME_PROFILE_REPOSITORY,
      useExisting: PrismaResumeProfileRepository,
    },
    ResumeProfileService,
    ResumeParserService,
  ],
  exports: [ResumeProfileService, ResumeParserService],
})
export class ResumeProfileModule {}
