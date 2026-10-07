import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  type ThrottlerStorage,
  ThrottlerStorageService,
} from '@nestjs/throttler';
import Redis from 'ioredis';

export interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

@Injectable()
export class CareerOsThrottlerStorage
  implements ThrottlerStorage, OnModuleDestroy
{
  private readonly logger = new Logger(CareerOsThrottlerStorage.name);
  private readonly memoryStorage = new ThrottlerStorageService();
  private redis: Redis | null = null;
  private isRedisAvailable = false;

  constructor(redisUrl?: string) {
    const url = redisUrl ?? process.env.REDIS_URL;
    if (url) {
      try {
        this.redis = new Redis(url, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          connectTimeout: 2000,
          retryStrategy: (times) =>
            times > 3 ? null : Math.min(times * 500, 2000),
        });

        this.redis.on('connect', () => {
          this.isRedisAvailable = true;
          this.logger.log('Connected to Redis for rate limiting.');
        });

        this.redis.on('error', (err: unknown) => {
          this.isRedisAvailable = false;
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(
            `Redis throttler error, falling back to in-memory: ${msg}`,
          );
        });

        this.redis.on('close', () => {
          this.isRedisAvailable = false;
        });

        this.redis.connect().catch((err: unknown) => {
          this.isRedisAvailable = false;
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(
            `Initial Redis throttler connection failed, using in-memory: ${msg}`,
          );
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Failed to initialize Redis throttler client: ${message}`,
        );
      }
    }
  }

  get isUsingRedis(): boolean {
    return this.isRedisAvailable && this.redis !== null;
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    if (!this.redis || !this.isRedisAvailable) {
      return this.memoryStorage.increment(
        key,
        ttl,
        limit,
        blockDuration,
        throttlerName,
      );
    }

    try {
      const redisKey = `careeros:throttle:${throttlerName}:${key}`;
      const blockKey = `careeros:throttle:blocked:${throttlerName}:${key}`;

      // Check block state first if blockDuration is specified
      if (blockDuration > 0) {
        const blockTtl = await this.redis.pttl(blockKey);
        if (blockTtl > 0) {
          return {
            totalHits: limit + 1,
            timeToExpire: blockTtl,
            isBlocked: true,
            timeToBlockExpire: blockTtl,
          };
        }
      }

      // Pipeline INCR and PTTL for atomicity and single round-trip
      const pipeline = this.redis.pipeline();
      pipeline.incr(redisKey);
      pipeline.pttl(redisKey);
      const results = await pipeline.exec();

      if (!results || results[0]?.[0] || results[1]?.[0]) {
        throw new Error('Redis throttler pipeline execution failed');
      }

      const totalHits = Number(results[0][1]);
      let timeToExpire = Number(results[1][1]);

      if (totalHits === 1 || timeToExpire <= 0) {
        await this.redis.pexpire(redisKey, ttl);
        timeToExpire = ttl;
      }

      let isBlocked = false;
      let timeToBlockExpire = 0;

      if (totalHits > limit && blockDuration > 0) {
        await this.redis.psetex(blockKey, blockDuration, '1');
        isBlocked = true;
        timeToBlockExpire = blockDuration;
      }

      return {
        totalHits,
        timeToExpire: Math.max(timeToExpire, 0),
        isBlocked,
        timeToBlockExpire,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Redis throttler increment failed, falling back to memory: ${message}`,
      );
      return this.memoryStorage.increment(
        key,
        ttl,
        limit,
        blockDuration,
        throttlerName,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch {
        this.redis.disconnect();
      }
    }
  }
}
