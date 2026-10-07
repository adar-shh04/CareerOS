import type { ExecutionContext } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ThrottlerLimitDetail } from '@nestjs/throttler';

import { CareerOsThrottlerGuard } from './careeros-throttler.guard';
import { CareerOsThrottlerStorage } from './careeros-throttler.storage';

class TestCareerOsThrottlerGuard extends CareerOsThrottlerGuard {
  public resolveTracker(req: Record<string, unknown>): Promise<string> {
    return this.getTracker(req);
  }

  public handleThrottling(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    return this.throwThrottlingException(context, detail);
  }
}

describe('CareerOs Rate Limiting & Throttler Hardening', () => {
  describe('CareerOsThrottlerGuard Tracker Resolution', () => {
    let guard: TestCareerOsThrottlerGuard;

    beforeEach(() => {
      const storage = new CareerOsThrottlerStorage();
      const reflector = new Reflector();
      guard = new TestCareerOsThrottlerGuard(
        { throttlers: [{ ttl: 60000, limit: 100 }] },
        storage,
        reflector,
      );
    });

    it('tracks by user ID when request is authenticated', async () => {
      const req = {
        user: { id: 'usr-12345', email: 'test@careeros.dev' },
        headers: { 'x-forwarded-for': '198.51.100.1' },
        ip: '127.0.0.1',
      };
      const tracker = await guard.resolveTracker(req);
      expect(tracker).toBe('user:usr-12345');
    });

    it('tracks by first IP from x-forwarded-for when anonymous', async () => {
      const req = {
        headers: {
          'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
        },
        ip: '127.0.0.1',
      };
      const tracker = await guard.resolveTracker(req);
      expect(tracker).toBe('ip:203.0.113.195');
    });

    it('tracks by cf-connecting-ip for Cloudflare edge proxy', async () => {
      const req = {
        headers: {
          'cf-connecting-ip': '198.51.100.42',
          'x-forwarded-for': '127.0.0.1',
        },
        ip: '127.0.0.1',
      };
      const tracker = await guard.resolveTracker(req);
      expect(tracker).toBe('ip:198.51.100.42');
    });

    it('tracks by req.ip if no forwarded headers are present', async () => {
      const req = {
        headers: {},
        ip: '192.0.2.1',
      };
      const tracker = await guard.resolveTracker(req);
      expect(tracker).toBe('ip:192.0.2.1');
    });
  });

  describe('CareerOsThrottlerGuard 429 Response & Headers', () => {
    let guard: TestCareerOsThrottlerGuard;

    beforeEach(() => {
      const storage = new CareerOsThrottlerStorage();
      const reflector = new Reflector();
      guard = new TestCareerOsThrottlerGuard(
        { throttlers: [{ ttl: 60000, limit: 10 }] },
        storage,
        reflector,
      );
    });

    it('sets Retry-After header and returns structured 429 error payload', async () => {
      const responseHeaders: Record<string, string> = {};
      const mockResponse = {
        header: jest.fn((key: string, value: string) => {
          responseHeaders[key] = value;
        }),
        setHeader: jest.fn((key: string, value: string) => {
          responseHeaders[key] = value;
        }),
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({ headers: {}, ip: '127.0.0.1' }),
          getResponse: () => mockResponse,
        }),
      } as unknown as ExecutionContext;

      const limitDetail: ThrottlerLimitDetail = {
        totalHits: 11,
        timeToExpire: 45000,
        isBlocked: true,
        timeToBlockExpire: 45000,
        limit: 10,
        ttl: 60000,
        key: 'test-key',
        tracker: 'ip:127.0.0.1',
      };

      let thrownError: unknown = null;
      try {
        await guard.handleThrottling(mockContext, limitDetail);
      } catch (err: unknown) {
        thrownError = err;
      }

      expect(thrownError).toBeInstanceOf(HttpException);
      const httpError = thrownError as HttpException;
      expect(httpError.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      const body = httpError.getResponse() as {
        statusCode: number;
        error: string;
        retryAfter: number;
      };
      expect(body.statusCode).toBe(429);
      expect(body.error).toBe('Too Many Requests');
      expect(body.retryAfter).toBe(45); // 45000ms rounded up to 45s
      expect(mockResponse.header).toHaveBeenCalledWith('Retry-After', '45');
      expect(mockResponse.header).toHaveBeenCalledWith(
        'X-RateLimit-Limit',
        '10',
      );
      expect(mockResponse.header).toHaveBeenCalledWith(
        'X-RateLimit-Remaining',
        '0',
      );
    });
  });

  describe('CareerOsThrottlerStorage In-Memory & Redis Operations', () => {
    it('increments correctly in-memory fallback', async () => {
      const storage = new CareerOsThrottlerStorage();
      const res1 = await storage.increment(
        'key-test-1',
        60000,
        5,
        0,
        'default',
      );
      expect(res1.totalHits).toBe(1);
      expect(res1.isBlocked).toBe(false);

      const res2 = await storage.increment(
        'key-test-1',
        60000,
        5,
        0,
        'default',
      );
      expect(res2.totalHits).toBe(2);
    });

    it('blocks when hits exceed limit with blockDuration in memory', async () => {
      const storage = new CareerOsThrottlerStorage();
      for (let i = 0; i < 3; i++) {
        await storage.increment('key-test-blocked', 60000, 2, 30000, 'default');
      }
      const blockedRes = await storage.increment(
        'key-test-blocked',
        60000,
        2,
        30000,
        'default',
      );
      expect(blockedRes.isBlocked).toBe(true);
      expect(blockedRes.timeToBlockExpire).toBeGreaterThan(0);
    });

    it('connects to real Redis if REDIS_URL is provided and functions correctly', async () => {
      const redisStorage = new CareerOsThrottlerStorage(
        'redis://localhost:6380',
      );
      // Give connection a moment to establish
      await new Promise((resolve) => setTimeout(resolve, 300));

      const testKey = `test-run-${String(Date.now())}`;
      const r1 = await redisStorage.increment(
        testKey,
        10000,
        5,
        0,
        'test_suite',
      );
      expect(r1.totalHits).toBe(1);

      const r2 = await redisStorage.increment(
        testKey,
        10000,
        5,
        0,
        'test_suite',
      );
      expect(r2.totalHits).toBe(2);

      await redisStorage.onModuleDestroy();
    });
  });
});
