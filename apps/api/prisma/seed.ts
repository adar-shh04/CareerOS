import { createHash, randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';

import { auth } from '../src/auth/better-auth.instance';
import { PrismaClient } from '../src/generated/prisma/client';
import { MATCHER_VERSION } from '../src/jobs/match-freshness';

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://careeros:careeros@localhost:5432/careeros?schema=public';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

function computeFingerprint(company: string, title: string, location: string): string {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  return createHash('sha256')
    .update(`${clean(company)}|${clean(title)}|${clean(location)}`)
    .digest('hex');
}

const SEED_JOBS = [
  {
    externalId: 'seed-linear-01',
    company: 'Linear',
    title: 'Product Engineer - Core Workflow',
    location: 'San Francisco, CA',
    isRemote: true,
    remotePolicy: 'REMOTE',
    salaryRange: '$160,000 - $210,000',
    description:
      'Build ultra-responsive, local-first client architecture for project tracking and issue management. Real-time sync engine work with TypeScript and React.',
    requiredSkills: ['TypeScript', 'React', 'GraphQL', 'Node.js'],
    preferredSkills: ['PostgreSQL', 'WebSockets', 'Tailwind CSS'],
    postedAt: new Date('2026-08-09T10:00:00.000Z'),
  },
  {
    externalId: 'seed-anthropic-02',
    company: 'Anthropic',
    title: 'Senior Frontend Engineer - Developer Experience',
    location: 'San Francisco, CA',
    isRemote: false,
    remotePolicy: 'ONSITE',
    salaryRange: '$175,000 - $225,000',
    description:
      'Craft developer tools, interfaces, and SDKs for developers building on Claude. High-quality React and TypeScript systems with clean API design.',
    requiredSkills: ['TypeScript', 'React', 'Next.js', 'Tailwind CSS'],
    preferredSkills: ['Python', 'GraphQL', 'Design Systems'],
    postedAt: new Date('2026-08-08T12:00:00.000Z'),
  },
  {
    externalId: 'seed-scale-03',
    company: 'Scale AI',
    title: 'Staff Fullstack & AI Systems Engineer',
    location: 'San Francisco, CA',
    isRemote: true,
    remotePolicy: 'REMOTE',
    salaryRange: '$190,000 - $240,000',
    description:
      'Build the infrastructure that powers Scale data labeling and AI training platform. Full-stack TypeScript, NestJS, and PostgreSQL systems with ML pipelines.',
    requiredSkills: ['TypeScript', 'React', 'NestJS', 'PostgreSQL', 'Python'],
    preferredSkills: ['Kubernetes', 'Docker', 'Distributed Systems'],
    postedAt: new Date('2026-08-07T14:00:00.000Z'),
  },
];

async function main(): Promise<void> {
  console.log('--- Starting CareerOS PostgreSQL Deterministic Seed ---');

  // Production guardrail: prevent accidental seeding of demo data into hosted/production environments
  const isProductionDb =
    process.env.NODE_ENV === 'production' ||
    Boolean(
      process.env.DATABASE_URL &&
        (process.env.DATABASE_URL.includes('supabase.com') ||
          process.env.DATABASE_URL.includes('pooler.supabase.com') ||
          process.env.DATABASE_URL.includes('rds.amazonaws.com') ||
          process.env.DATABASE_URL.includes('cockroachlabs.cloud')),
    );

  if (isProductionDb && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    console.error(
      'CRITICAL SAFETY ABORT: Database seeding with demo credentials is disabled in production environments. Set ALLOW_PRODUCTION_SEED=true to override.',
    );
    process.exit(1);
  }

  if (isProductionDb && !process.env.SEED_USER_PASSWORD) {
    console.error(
      'CRITICAL SAFETY ABORT: SEED_USER_PASSWORD environment variable must be explicitly provided when seeding a production database.',
    );
    process.exit(1);
  }

  const demoEmail = 'demo@careeros.dev';
  const demoPassword =
    process.env.SEED_USER_PASSWORD ||
    process.env.DEMO_USER_PASSWORD ||
    'DemoPass1234!';
  const demoName = 'Alex Rivera';

  let user = await prisma.user.findUnique({
    where: { email: demoEmail },
    include: { memberships: { include: { organization: true } } },
  });

  if (!user) {
    console.log(`Creating demo user: ${demoEmail}...`);
    await auth.api.signUpEmail({
      body: {
        email: demoEmail,
        password: demoPassword,
        name: demoName,
      },
    });

    user = await prisma.user.findUniqueOrThrow({
      where: { email: demoEmail },
      include: { memberships: { include: { organization: true } } },
    });
  } else {
    console.log(`Demo user ${demoEmail} already exists.`);
  }

  const organization = user.memberships[0]?.organization;
  if (!organization) {
    throw new Error('Workspace was not auto-provisioned for demo user.');
  }

  const workspaceId = organization.id;
  console.log(`Using Workspace: ${organization.name} (${workspaceId})`);

  // Ensure workspace onboarding is marked complete
  await prisma.organization.update({
    where: { id: workspaceId },
    data: {
      metadata: JSON.stringify({ completedAt: new Date().toISOString() }),
    },
  });

  // Seed / Upsert Master Career Profile
  let profile = await prisma.masterCareerProfile.findUnique({
    where: { organizationId: workspaceId },
  });

  if (!profile) {
    profile = await prisma.masterCareerProfile.create({
      data: {
        id: randomUUID(),
        organizationId: workspaceId,
        fullName: demoName,
        headline: 'Staff Fullstack & AI Systems Engineer',
        location: 'San Francisco, CA',
        email: demoEmail,
      },
    });
    console.log('Created Master Career Profile.');
  }

  // Seed experience entries
  const existingExp = await prisma.experienceEntry.count({
    where: { profileId: profile.id },
  });
  if (existingExp === 0) {
    await prisma.experienceEntry.createMany({
      data: [
        {
          id: randomUUID(),
          profileId: profile.id,
          title: 'Senior Full-Stack Engineer',
          company: 'Acme Technologies',
          location: 'San Francisco, CA',
          startDate: '2022-03',
          endDate: 'Present',
          bullets: [
            'Architected distributed microservices and real-time dashboard applications using React, Next.js, TypeScript, and NestJS.',
          ],
          technologies: ['TypeScript', 'React', 'Next.js', 'NestJS', 'PostgreSQL', 'Docker'],
        },
        {
          id: randomUUID(),
          profileId: profile.id,
          title: 'Software Engineer',
          company: 'CloudFlow Labs',
          location: 'San Francisco, CA',
          startDate: '2019-06',
          endDate: '2022-02',
          bullets: [
            'Developed high-throughput data processing services in Node.js and PostgreSQL. Migrated frontend codebase to TypeScript.',
          ],
          technologies: ['TypeScript', 'Node.js', 'PostgreSQL', 'GraphQL', 'Redis'],
        },
      ],
    });
    console.log('Seeded experience entries.');
  }

  // Seed skill entries
  const existingSkills = await prisma.skillEntry.count({
    where: { profileId: profile.id },
  });
  if (existingSkills === 0) {
    const skills = [
      'TypeScript',
      'React',
      'Next.js',
      'Node.js',
      'NestJS',
      'PostgreSQL',
      'GraphQL',
      'Docker',
      'Tailwind CSS',
    ];
    await prisma.skillEntry.createMany({
      data: skills.map((name) => ({
        id: randomUUID(),
        profileId: profile.id,
        name,
        category: 'Core Competency',
      })),
    });
    console.log('Seeded skill entries.');
  }

  // Seed canonical Resume Profile
  let resumeProfile = await prisma.resumeProfile.findFirst({
    where: { organizationId: workspaceId },
  });

  if (!resumeProfile) {
    resumeProfile = await prisma.resumeProfile.create({
      data: {
        id: randomUUID(),
        organizationId: workspaceId,
        name: 'Staff Fullstack Engineer Resume Profile',
        roleFocus: 'Staff Fullstack & AI Systems Engineer',
        visibleSections: ['summary', 'experience', 'skills', 'projects'],
        sectionOrder: ['summary', 'experience', 'skills', 'projects'],
        highlightRules: [],
        priorityProjectIds: [],
        prioritySkillIds: [],
        priorityExperienceIds: [],
        priorityAchievementIds: [],
        priorityCertificationIds: [],
        styleSettings: {},
      },
    });
    console.log('Created canonical Resume Profile.');
  }

  // Seed Resume Version snapshot (compound FK verified)
  const existingVersion = await prisma.resumeVersion.findFirst({
    where: { organizationId: workspaceId, resumeProfileId: resumeProfile.id },
  });

  if (!existingVersion) {
    await prisma.resumeVersion.create({
      data: {
        id: randomUUID(),
        organizationId: workspaceId,
        resumeProfileId: resumeProfile.id,
        targetCompany: 'Linear',
        targetRole: 'Product Engineer - Core Workflow',
        masterProfileSnapshot: {
          identity: { fullName: demoName, email: demoEmail },
          headline: 'Staff Fullstack & AI Systems Engineer',
        },
        selectedRecordIds: {},
        outputFormat: 'LATEX',
      },
    });
    console.log('Created Resume Version snapshot.');
  }

  // Seed Canonical Development Jobs
  const seededJobIds: string[] = [];
  for (const jobData of SEED_JOBS) {
    const fingerprint = computeFingerprint(jobData.company, jobData.title, jobData.location);
    let job = await prisma.job.findFirst({
      where: { externalId: jobData.externalId },
    });

    if (job) {
      job = await prisma.job.update({
        where: { id: job.id },
        data: {
          company: jobData.company,
          title: jobData.title,
          location: jobData.location,
          isRemote: jobData.isRemote,
          remotePolicy: jobData.remotePolicy,
          salaryRange: jobData.salaryRange,
          description: jobData.description,
          requiredSkills: jobData.requiredSkills,
          preferredSkills: jobData.preferredSkills,
          fingerprint,
        },
      });
    } else {
      job = await prisma.job.create({
        data: {
          id: randomUUID(),
          externalId: jobData.externalId,
          source: 'manual-dev-seed',
          company: jobData.company,
          title: jobData.title,
          location: jobData.location,
          isRemote: jobData.isRemote,
          remotePolicy: jobData.remotePolicy,
          salaryRange: jobData.salaryRange,
          description: jobData.description,
          requiredSkills: jobData.requiredSkills,
          preferredSkills: jobData.preferredSkills,
          postedAt: jobData.postedAt,
          fingerprint,
        },
      });
    }
    seededJobIds.push(job.id);
  }
  console.log(`Seeded ${seededJobIds.length} canonical development jobs.`);

  // Seed Job Matches & Workspace Job States
  for (const jobId of seededJobIds) {
    const existingMatch = await prisma.jobMatch.findFirst({
      where: {
        organizationId: workspaceId,
        jobId,
        resumeProfileId: resumeProfile.id,
      },
    });

    const matchPayload = {
      matcherVersion: MATCHER_VERSION,
      overallScore: 82,
      skillScore: 85,
      roleScore: 80,
      experienceScore: 80,
      locationScore: 100,
      seniorityScore: 80,
      matchedSkills: ['TypeScript', 'React', 'Node.js'],
      missingSkills: [],
      confidence: 0.85,
      explanation: 'Strong match on required skills and remote work arrangement.',
    };

    if (existingMatch) {
      await prisma.jobMatch.update({
        where: { id: existingMatch.id },
        data: matchPayload,
      });
    } else {
      await prisma.jobMatch.create({
        data: {
          id: randomUUID(),
          organizationId: workspaceId,
          jobId,
          resumeProfileId: resumeProfile.id,
          ...matchPayload,
        },
      });
    }

    await prisma.workspaceJobState.upsert({
      where: {
        organizationId_jobId: {
          organizationId: workspaceId,
          jobId,
        },
      },
      update: {},
      create: {
        id: randomUUID(),
        organizationId: workspaceId,
        jobId,
        status: 'discovered',
        isSaved: false,
        isDismissed: false,
      },
    });
  }

  // Seed sample Application in pipeline
  const firstJobId = seededJobIds[0];
  if (firstJobId) {
    const existingApp = await prisma.application.findUnique({
      where: {
        organizationId_jobId: {
          organizationId: workspaceId,
          jobId: firstJobId,
        },
      },
    });

    if (!existingApp) {
      const appId = randomUUID();
      await prisma.application.create({
        data: {
          id: appId,
          organizationId: workspaceId,
          jobId: firstJobId,
          status: 'saved',
          notes: 'High priority role. Follow up with team on tech stack.',
          resumeProfileId: resumeProfile.id,
        },
      });

      await prisma.applicationStatusHistory.create({
        data: {
          id: randomUUID(),
          applicationId: appId,
          status: 'saved',
          notes: 'Seeded initial application state: saved.',
        },
      });

      await prisma.workspaceJobState.update({
        where: {
          organizationId_jobId: {
            organizationId: workspaceId,
            jobId: firstJobId,
          },
        },
        data: {
          status: 'saved',
          isSaved: true,
        },
      });
      console.log('Seeded sample application in saved stage.');
    }
  }

  console.log('--- CareerOS PostgreSQL Seed Complete ---');
  console.log(`Demo Account: ${demoEmail} / ${demoPassword}`);
  console.log(`Workspace ID: ${workspaceId}`);
}

main()
  .catch((err) => {
    console.error('Seed execution error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
