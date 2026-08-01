import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('requires authentication for career-profile routes', () => {
    return request(app.getHttpServer())
      .get('/workspaces/00000000-0000-4000-8000-000000000000/career-profile')
      .expect(401);
  });

  it('requires authentication for resume-profile routes', () => {
    return request(app.getHttpServer())
      .get('/workspaces/00000000-0000-4000-8000-000000000000/resume-profiles')
      .expect(401);
  });

  afterEach(async () => {
    await app.close();
  });
});
