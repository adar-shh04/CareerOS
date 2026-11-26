import type { INestApplication } from '@nestjs/common';
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

// Mirrors the multipart handling used by ResumeProfileController: the
// FileInterceptor from @nestjs/platform-express parses the upload before the
// handler runs, so this test exercises the same code path without any
// authentication or persistence.
@Controller('resume-upload')
class ResumeUploadTestController {
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file?: Express.Multer.File) {
    return { filename: file?.originalname ?? null };
  }
}

describe('resume upload multipart handling', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ResumeUploadTestController],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts a normal resume upload and rejects prototype-poisoning field names', async () => {
    await request(app.getHttpServer())
      .post('/resume-upload')
      .field('resumeText', 'Jane Doe')
      .attach('file', Buffer.from('%PDF-1.4 dummy resume'), 'resume.pdf')
      .expect(201, { filename: 'resume.pdf' });

    await request(app.getHttpServer())
      .post('/resume-upload')
      .field('__proto__[polluted]', 'true')
      .attach('file', Buffer.from('%PDF-1.4 dummy resume'), 'resume.pdf')
      .expect(400);
  });
});
