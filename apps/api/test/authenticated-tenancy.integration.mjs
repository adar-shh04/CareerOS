import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../dist/generated/prisma/client.js';
import { PrismaJobsRepository } from '../dist/jobs/prisma-jobs.repository.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.includes('careeros_integration')) {
  throw new Error(
    'Integration tests require an isolated DATABASE_URL containing careeros_integration.',
  );
}

const port = 3011;
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    APIFY_API_TOKEN: '',
    PORT: String(port),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverOutput = '';
server.stdout.on('data', (chunk) => {
  serverOutput += chunk.toString();
});
server.stderr.on('data', (chunk) => {
  serverOutput += chunk.toString();
});

try {
  await waitForHealth();

  const userA = createSession();
  const userB = createSession();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  await registerAndOnboard(userA, `tenant-a-${suffix}@example.test`, 'Tenant A');
  await registerAndOnboard(userB, `tenant-b-${suffix}@example.test`, 'Tenant B');

  const organizationA = await activeOrganization(userA);
  const organizationB = await activeOrganization(userB);

  assert.notEqual(
    organizationA.id,
    organizationB.id,
    'each user must have an independent personal organization',
  );

  // Unauthenticated request rejection (No cookie/token)
  const unauthSession = createSession();
  assert.equal(
    (await unauthSession.request('GET', `/workspaces/${organizationA.id}/career-profile`)).status,
    401,
    'Unauthenticated request must be rejected'
  );
  assert.equal(
    (await unauthSession.request('GET', `/workspaces/${organizationA.id}/resume-profiles`)).status,
    401,
  );
  assert.equal(
    (await unauthSession.request('GET', `/workspaces/${organizationA.id}/jobs`)).status,
    401,
  );

  // BFF-pattern cookie forwarding verification
  const bffResponse = await fetch(`${baseUrl}/api/auth/get-session`, {
    headers: { cookie: userA.cookie },
  });
  const bffData = await bffResponse.json();
  assert.equal(bffResponse.status, 200);
  assert.equal(bffData.session.activeOrganizationId, organizationA.id, 'BFF pattern must resolve active organization');

  const bffUnauthResponse = await fetch(`${baseUrl}/api/auth/get-session`);
  assert.equal(bffUnauthResponse.status, 200, 'Unauthenticated BFF call must return 200');
  const bffUnauthBody = await bffUnauthResponse.text();
  assert.equal(bffUnauthBody, 'null', 'Unauthenticated BFF call must return null session');

  const sessionA = await userA.request('GET', '/api/auth/get-session');
  const sessionB = await userB.request('GET', '/api/auth/get-session');
  assert.equal(sessionA.status, 200);
  assert.equal(sessionB.status, 200);
  assert.equal(sessionA.body.session.activeOrganizationId, organizationA.id);
  assert.equal(sessionB.body.session.activeOrganizationId, organizationB.id);

  const profileA = profileInput('Tenant A');
  assert.equal(
    (await userA.request('PUT', `/workspaces/${organizationA.id}/career-profile`, profileA)).status,
    200,
  );

  // Bearer token path test
  const bearerSession = createSession();
  const bearerResponse = await bearerSession.request('GET', `/workspaces/${organizationA.id}/career-profile`, undefined, {
    Authorization: `Bearer ${userA.token}`
  });
  assert.equal(bearerResponse.status, 200, 'Bearer token must allow access');
  assert.equal(bearerResponse.body.identity.fullName, 'Tenant A');
  assert.equal(
    (await userB.request('GET', `/workspaces/${organizationA.id}/career-profile`)).status,
    403,
    'a client-supplied organization A URL must not override user B membership',
  );
  assert.equal(
    (
      await userB.request(
        'PUT',
        `/workspaces/${organizationA.id}/career-profile`,
        profileInput('Tenant B cannot overwrite A'),
      )
    ).status,
    403,
  );
  const profileRead = await userA.request(
    'GET',
    `/workspaces/${organizationA.id}/career-profile`,
  );
  assert.equal(profileRead.status, 200);
  assert.equal(profileRead.body.identity.fullName, 'Tenant A');

  const resumeProfile = await userA.request(
    'POST',
    `/workspaces/${organizationA.id}/resume-profiles`,
    {
      name: 'Tenant A Profile',
      visibleSections: ['identity', 'skills'],
      sectionOrder: ['identity', 'skills'],
    },
  );
  assert.equal(resumeProfile.status, 201);
  const resumeProfileAId = resumeProfile.body.id;

  const version = await userA.request(
    'POST',
    `/workspaces/${organizationA.id}/resume-profiles/${resumeProfileAId}/versions`,
    {
      targetCompany: 'Tenant A Company',
      outputFormat: 'html',
      selectedRecordIds: emptySelectedRecordIds(),
    },
  );
  assert.equal(version.status, 201);

  for (const [method, path, body] of [
    ['GET', `/workspaces/${organizationA.id}/resume-profiles/${resumeProfileAId}`],
    ['GET', `/workspaces/${organizationA.id}/resume-profiles/${resumeProfileAId}/versions`],
    [
      'POST',
      `/workspaces/${organizationA.id}/resume-profiles/${resumeProfileAId}/versions`,
      { outputFormat: 'html' },
    ],
  ]) {
    const response = await userB.request(method, path, body);
    assert.equal(response.status, 403, `user B must be denied ${method} ${path}`);
  }

  // Verify live ingestion without APIFY_API_TOKEN is explicitly rejected with 400
  const unconfiguredIngest = await userA.request(
    'POST',
    `/workspaces/${organizationA.id}/jobs/ingest`,
    { query: 'Software Engineer', limit: 5 },
  );
  assert.equal(
    unconfiguredIngest.status,
    400,
    'Live ingestion without API token must return 400 Bad Request',
  );
  assert.ok(
    unconfiguredIngest.body?.message?.includes('Apify API token is not configured'),
    'Must return explicit configuration error message',
  );

  // Setup direct DB connection for lifecycle test job and concurrency checks
  const dbPool = new Pool({ connectionString: databaseUrl });
  const directPrisma = new PrismaClient({
    adapter: new PrismaPg(dbPool),
  });
  const mockPrismaService = { client: directPrisma };
  const jobsRepo = new PrismaJobsRepository(mockPrismaService);

  // Create a canonical test job for tenant-scoped interaction testing
  const testJob = await jobsRepo.upsertCanonicalJob({
    source: 'integration-seed',
    externalId: `seed-job-${suffix}`,
    company: 'Acme Systems',
    title: 'Senior Distributed Systems Engineer',
    location: 'San Francisco, CA',
    isRemote: true,
    requiredSkills: ['TypeScript', 'Node.js', 'PostgreSQL', 'React'],
    preferredSkills: ['NestJS', 'Docker'],
  });
  const jobId = testJob.id;

  assert.equal(
    (await userA.request('POST', `/workspaces/${organizationA.id}/jobs/${jobId}/save`)).status,
    200,
  );
  assert.equal(
    (await userA.request('POST', `/workspaces/${organizationA.id}/jobs/${jobId}/dismiss`)).status,
    200,
  );
  assert.equal(
    (
      await userA.request('PATCH', `/workspaces/${organizationA.id}/jobs/${jobId}/state`, {
        status: 'applied',
        notes: 'Tenant A only',
      })
    ).status,
    200,
  );

  for (const [method, path, body] of [
    ['POST', `/workspaces/${organizationA.id}/jobs/${jobId}/save`],
    ['POST', `/workspaces/${organizationA.id}/jobs/${jobId}/dismiss`],
    [
      'PATCH',
      `/workspaces/${organizationA.id}/jobs/${jobId}/state`,
      { status: 'applied', notes: 'Tenant B cannot write Tenant A state' },
    ],
    ['GET', `/workspaces/${organizationA.id}/jobs/${jobId}/analysis`],
    [
      'POST',
      `/workspaces/${organizationA.id}/jobs/${jobId}/targeted-resume`,
      { resumeProfileId: resumeProfileAId },
    ],
  ]) {
    const response = await userB.request(method, path, body);
    assert.equal(response.status, 403, `user B must be denied ${method} ${path}`);
  }

  // ── Concurrency & Ingestion Race-Safety Verification ───────────────────
  console.log('Testing concurrency and canonical job ingestion race-safety...');

  // Test Case 1: 10 concurrent HTTP ingestion requests without token return 400 without crashing server (0 HTTP 500s)
  const concurrentIngestionPromises = Array.from({ length: 10 }, () =>
    userA.request('POST', `/workspaces/${organizationA.id}/jobs/ingest`, {
      query: 'Software Engineer',
      limit: 5,
    }),
  );
  const concurrentIngestionResults = await Promise.all(concurrentIngestionPromises);
  for (const res of concurrentIngestionResults) {
    assert.equal(
      res.status,
      400,
      'Concurrent unconfigured ingestion must return 400 (never 500 or silent success)',
    );
  }

  // Test Case 2: 10 concurrent requests for SAME (source, externalId)
  const concurrentExtId = `concurrent-ext-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const concurrentSource = 'concurrency-test-source';

  const concurrentExtPromises = Array.from({ length: 10 }, (_, i) =>
    jobsRepo.upsertCanonicalJob({
      source: concurrentSource,
      externalId: concurrentExtId,
      company: 'Concurrency Scale Inc',
      title: `Staff Concurrency Systems Engineer v${i}`,
      location: 'San Francisco, CA',
      isRemote: true,
      requiredSkills: ['TypeScript', 'PostgreSQL', 'Distributed Systems'],
    }),
  );

  const concurrentExtResults = await Promise.all(concurrentExtPromises);
  assert.equal(concurrentExtResults.length, 10, 'All 10 concurrent operations must resolve successfully');
  const firstCanonicalId = concurrentExtResults[0].id;
  for (const res of concurrentExtResults) {
    assert.equal(res.id, firstCanonicalId, 'All concurrent upserts must resolve to the identical canonical job ID');
    assert.equal(res.source, concurrentSource);
    assert.equal(res.externalId, concurrentExtId);
  }

  // Verify in PostgreSQL that exactly 1 row exists in the jobs table
  const extDbCheck = await dbPool.query(
    'SELECT count(*) AS count FROM jobs WHERE source = $1 AND external_id = $2',
    [concurrentSource, concurrentExtId],
  );
  assert.equal(
    parseInt(extDbCheck.rows[0].count, 10),
    1,
    'Exactly 1 canonical job row must exist in DB for concurrent (source, externalId)',
  );

  // Test Case 3: 10 concurrent requests for SAME fingerprint (no externalId)
  const concurrentFp = `fp-race-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const concurrentFpPromises = Array.from({ length: 10 }, (_, i) =>
    jobsRepo.upsertCanonicalJob({
      company: 'Fingerprint Deduplication Corp',
      title: `Senior Fingerprint Engineer v${i}`,
      location: 'Remote',
      fingerprint: concurrentFp,
      isRemote: true,
      requiredSkills: ['Node.js', 'Prisma', 'PostgreSQL'],
    }),
  );

  const concurrentFpResults = await Promise.all(concurrentFpPromises);
  assert.equal(concurrentFpResults.length, 10, 'All 10 concurrent fingerprint operations must resolve successfully');
  const firstFpId = concurrentFpResults[0].id;
  for (const res of concurrentFpResults) {
    assert.equal(res.id, firstFpId, 'All concurrent fingerprint upserts must resolve to the identical canonical job ID');
    assert.equal(res.fingerprint, concurrentFp);
  }

  // Verify in PostgreSQL that exactly 1 row exists in the jobs table
  const fpDbCheck = await dbPool.query(
    'SELECT count(*) AS count FROM jobs WHERE fingerprint = $1',
    [concurrentFp],
  );
  assert.equal(
    parseInt(fpDbCheck.rows[0].count, 10),
    1,
    'Exactly 1 canonical job row must exist in DB for concurrent fingerprint',
  );

  await directPrisma.$disconnect();
  await dbPool.end();

  console.log('Authenticated multi-tenant integration tests passed.');
} finally {
  server.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => server.once('exit', resolve)),
    delay(5_000),
  ]);
  if (!server.killed) server.kill('SIGKILL');
}

function createSession() {
  let cookie = '';
  let token = '';
  return {
    get cookie() { return cookie; },
    get token() { return token; },
    async request(method, path, body, customHeaders = {}) {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          origin: 'http://localhost:3000',
          ...(cookie && !customHeaders.cookie && !customHeaders.Authorization ? { cookie } : {}),
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
          ...customHeaders,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });

      let currentCookies = cookie ? cookie.split('; ') : [];
      for (const setCookie of response.headers.getSetCookie()) {
        const parsed = setCookie.split(';', 1)[0];
        const name = parsed.split('=', 1)[0];
        currentCookies = currentCookies.filter(c => !c.startsWith(name + '='));
        currentCookies.push(parsed);
      }
      cookie = currentCookies.join('; ');
      
      const authToken = response.headers.get('set-auth-token');
      if (authToken) {
        token = authToken;
      }

      const text = await response.text();
      return {
        status: response.status,
        body: text ? JSON.parse(text) : undefined,
        headers: response.headers,
      };
    },
  };
}

async function registerAndOnboard(session, email, workspaceName) {
  const signUp = await session.request('POST', '/api/auth/sign-up/email', {
    email,
    password: 'tenant-test-password',
    name: workspaceName,
  });
  assert.equal(signUp.status, 200, JSON.stringify(signUp.body));

  const onboarding = await session.request('POST', '/workspaces/onboarding/complete', {
    name: workspaceName,
    workspaceName,
  });
  assert.equal(onboarding.status, 201, JSON.stringify(onboarding.body));
  
  // Set the active organization in Better Auth so the session cache is updated
  const setActive = await session.request('POST', '/api/auth/organization/set-active', {
    organizationId: onboarding.body.workspace.id,
  });
  assert.equal(setActive.status, 200, JSON.stringify(setActive.body));
}

async function activeOrganization(session) {
  const sessionResponse = await session.request('GET', '/api/auth/get-session');
  const organizationsResponse = await session.request('GET', '/api/auth/organization/list');
  assert.equal(sessionResponse.status, 200);
  assert.equal(organizationsResponse.status, 200);

  const activeOrganizationId = sessionResponse.body.session.activeOrganizationId;
  assert.ok(activeOrganizationId, 'session must have an active organization');
  const organization = organizationsResponse.body.find(
    (candidate) => candidate.id === activeOrganizationId,
  );
  assert.ok(organization, 'active organization must belong to the authenticated user');
  return organization;
}

function profileInput(name) {
  return {
    identity: { fullName: name, headline: 'Software Engineer' },
    education: [],
    experiences: [],
    projects: [],
    achievements: [],
    skills: [],
    technologies: [],
    publications: [],
    hackathons: [],
    certifications: [],
    links: [],
  };
}

function emptySelectedRecordIds() {
  return {
    skillIds: [],
    projectIds: [],
    experienceIds: [],
    achievementIds: [],
    certificationIds: [],
  };
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for integration server.\n${serverOutput}`);
}
