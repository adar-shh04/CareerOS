import { Module } from '@nestjs/common';

import { ByokModule } from '../byok/byok.module';
import { DatabaseModule } from '../database/database.module';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';

@Module({
  imports: [DatabaseModule, ByokModule],
  controllers: [InsightsController],
  providers: [InsightsService],
  exports: [InsightsService],
})
export class InsightsModule {}
