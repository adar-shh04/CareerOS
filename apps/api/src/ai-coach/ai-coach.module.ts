import { Module } from '@nestjs/common';

import { ByokModule } from '../byok/byok.module';
import { CareerProfileModule } from '../career-profile/career-profile.module';
import { JobsModule } from '../jobs/jobs.module';
import { ResumeProfileModule } from '../resume-profile/resume-profile.module';
import { AiCoachController } from './ai-coach.controller';
import { AiCoachService } from './ai-coach.service';

@Module({
  imports: [ByokModule, CareerProfileModule, ResumeProfileModule, JobsModule],
  controllers: [AiCoachController],
  providers: [AiCoachService],
  exports: [AiCoachService],
})
export class AiCoachModule {}
