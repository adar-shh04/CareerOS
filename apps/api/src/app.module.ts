import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ByokModule } from './byok/byok.module';
import { CareerProfileModule } from './career-profile/career-profile.module';
import { BetterAuthGuard } from './common/guards/better-auth.guard';
import { DatabaseModule } from './database/database.module';
import { JobsModule } from './jobs/jobs.module';
import { ResumeProfileModule } from './resume-profile/resume-profile.module';
import { WorkspaceModule } from './workspace/workspace.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    AuthModule,
    WorkspaceModule,
    ByokModule,
    CareerProfileModule,
    ResumeProfileModule,
    JobsModule,
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
