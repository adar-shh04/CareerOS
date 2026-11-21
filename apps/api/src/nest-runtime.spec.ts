import { readFileSync } from 'node:fs';

import express from 'express';
import request from 'supertest';

function installedVersion(pkg: string): string {
  const packageJsonPath = require.resolve(`${pkg}/package.json`);
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
    version: string;
  };
  return packageJson.version;
}

function majorVersion(version: string): number {
  return Number.parseInt(version.split('.')[0] ?? '0', 10);
}

describe('NestJS runtime dependencies', () => {
  it('runs on the Express 5 based NestJS major', () => {
    expect(
      majorVersion(installedVersion('@nestjs/core')),
    ).toBeGreaterThanOrEqual(12);
    expect(
      majorVersion(installedVersion('@nestjs/platform-express')),
    ).toBeGreaterThanOrEqual(12);
    expect(
      majorVersion(installedVersion('@nestjs/testing')),
    ).toBeGreaterThanOrEqual(12);
  });

  it('routes the Better Auth catch-all using Express 5 wildcard syntax', async () => {
    const app = express();

    // Mirrors the catch-all registered in src/main.ts.
    app.use('/api/auth/{*any}', (_req, res) => {
      res.json({ matched: true });
    });

    await request(app)
      .get('/api/auth/sign-in/email')
      .expect(200, { matched: true });

    await request(app).get('/api/auth/sign-in').expect(200, { matched: true });
  });
});
