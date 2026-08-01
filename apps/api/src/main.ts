import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { toNodeHandler } from 'better-auth/node';

import { AppModule } from './app.module';
import { auth } from './auth/better-auth.instance';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Better Auth needs the raw (unparsed) request body for its handler,
    // so we disable Nest's default body parser and mount it selectively
    // below, *after* the auth route is wired up.
    bodyParser: false,
  });

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    credentials: true,
  });

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

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
