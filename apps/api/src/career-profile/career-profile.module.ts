import { Module } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { CareerProfileController } from './career-profile.controller';
import { CAREER_PROFILE_REPOSITORY } from './career-profile.repository';
import { CareerProfileService } from './career-profile.service';
import { PrismaCareerProfileRepository } from './prisma-career-profile.repository';

@Module({
  controllers: [CareerProfileController],
  providers: [
    PrismaService,
    PrismaCareerProfileRepository,
    {
      provide: CAREER_PROFILE_REPOSITORY,
      useExisting: PrismaCareerProfileRepository,
    },
    CareerProfileService,
  ],
  exports: [CareerProfileService],
})
export class CareerProfileModule {}
