import * as fs from 'node:fs';
import * as path from 'node:path';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { AiCoachModule } from './ai-coach/ai-coach.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApplicationsModule } from './applications/applications.module';
import { AuthModule } from './auth/auth.module';
import { ByokModule } from './byok/byok.module';
import { CareerProfileModule } from './career-profile/career-profile.module';
import { BetterAuthGuard } from './common/guards/better-auth.guard';
import { DatabaseModule } from './database/database.module';
import { FeedbackModule } from './feedback/feedback.module';
import { InsightsModule } from './insights/insights.module';
import { JobsModule } from './jobs/jobs.module';
import { ResumeProfileModule } from './resume-profile/resume-profile.module';
import { WorkspaceModule } from './workspace/workspace.module';

const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../../../.env'),
];
const envFilePaths = envCandidates.filter(
  (candidate, idx, list) =>
    fs.existsSync(candidate) && list.indexOf(candidate) === idx,
);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envFilePaths.length > 0 ? envFilePaths : '.env',
    }),
    DatabaseModule,
    AuthModule,
    WorkspaceModule,
    ByokModule,
    FeedbackModule,
    CareerProfileModule,
    ResumeProfileModule,
    JobsModule,
    ApplicationsModule,
    AiCoachModule,
    InsightsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: BetterAuthGuard,
    },
  ],
})
export class AppModule {}
