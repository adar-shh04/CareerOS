import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { CareerOsThrottlerGuard } from './careeros-throttler.guard';
import { CareerOsThrottlerStorage } from './careeros-throttler.storage';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isTest =
          process.env.NODE_ENV === 'test' ||
          process.env.CAREEROS_TEST_ENV === 'true';
        return {
          throttlers: [
            {
              name: 'default',
              ttl: 60000, // 60 seconds
              limit: isTest ? 1000 : 120, // 120 requests/minute in prod/dev
            },
          ],
          storage: new CareerOsThrottlerStorage(
            config.get<string>('REDIS_URL'),
          ),
        };
      },
    }),
  ],
  providers: [CareerOsThrottlerGuard],
  exports: [CareerOsThrottlerGuard, ThrottlerModule],
})
export class CareerOsThrottlerModule {}
