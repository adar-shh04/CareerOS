import * as fs from 'node:fs';
import * as path from 'node:path';

import dotenv from 'dotenv';

// Pre-load root and local .env so early initializations (e.g. Better Auth) have complete env
const explicitPort = process.env.PORT;
const explicitDbUrl = process.env.DATABASE_URL;
const explicitDirectUrl = process.env.DIRECT_URL;
const explicitApifyToken = process.env.APIFY_API_TOKEN;

const rootEnvPath = path.resolve(process.cwd(), '../../.env');
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}
const localEnvPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath, override: true });
}

if (explicitPort) process.env.PORT = explicitPort;
if (explicitDbUrl) process.env.DATABASE_URL = explicitDbUrl;
if (explicitDirectUrl) process.env.DIRECT_URL = explicitDirectUrl;
if (explicitApifyToken !== undefined)
  process.env.APIFY_API_TOKEN = explicitApifyToken;

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { toNodeHandler } from 'better-auth/node';
import type { NextFunction, Request, Response } from 'express';

import { AppModule } from './app.module';
import { auth } from './auth/better-auth.instance';
import { CareerOsThrottlerStorage } from './common/throttler/careeros-throttler.storage';

export async function createApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Better Auth needs the raw (unparsed) request body for its handler,
    // so we disable Nest's default body parser and mount it selectively
    // below, *after* the auth route is wired up.
    bodyParser: false,
  });

  // Enable trust proxy for production behind reverse proxies (Vercel, Traefik, Caddy, Nginx)
  app.set('trust proxy', true);

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    credentials: true,
  });

  // Rate limit sensitive Better Auth operations (sign-in, sign-up, password reset)
  const isTest =
    process.env.NODE_ENV === 'test' || process.env.CAREEROS_TEST_ENV === 'true';
  const authThrottlerStorage = new CareerOsThrottlerStorage(
    process.env.REDIS_URL,
  );
  app.use(
    '/api/auth',
    async (req: Request, res: Response, next: NextFunction) => {
      const isSensitive =
        !isTest &&
        req.method === 'POST' &&
        (req.path.includes('/sign-in') ||
          req.path.includes('/sign-up') ||
          req.path.includes('/reset-password') ||
          req.path.includes('/forget-password'));

      if (isSensitive) {
        const forwarded =
          req.headers['cf-connecting-ip'] ??
          req.headers['x-forwarded-for'] ??
          req.headers['x-real-ip'];
        const rawIp = Array.isArray(forwarded) ? forwarded[0] : forwarded;
        const clientIp = rawIp?.split(',')[0]?.trim() ?? req.ip ?? 'unknown';

        try {
          const record = await authThrottlerStorage.increment(
            `auth_ip:${clientIp}`,
            60000,
            10,
            60000,
            'auth_sensitive',
          );

          if (record.isBlocked || record.totalHits > 10) {
            const retryAfter = Math.max(
              1,
              Math.ceil(
                (record.timeToBlockExpire || record.timeToExpire || 1000) /
                  1000,
              ),
            );
            res.setHeader('Retry-After', retryAfter.toString());
            res.setHeader('X-RateLimit-Limit', '10');
            res.setHeader('X-RateLimit-Remaining', '0');
            res.status(429).json({
              statusCode: 429,
              error: 'Too Many Requests',
              message:
                'Too many authentication attempts, please try again later.',
              retryAfter,
            });
            return;
          }
        } catch {
          // Fail-open for auth middleware on unexpected storage error
        }
      }
      next();
    },
  );

  // Must be registered before Nest's json/urlencoded body parsers touch
  // this path, or Better Auth will read an already-consumed stream.
  app.use('/api/auth/{*any}', toNodeHandler(auth));

  const { json, urlencoded } = await import('express');
  app.use(json());
  app.use(urlencoded({ extended: true }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  return app;
}

async function bootstrap() {
  const app = await createApp();
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
