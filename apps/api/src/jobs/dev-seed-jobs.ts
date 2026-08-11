/**
 * dev-seed-jobs.ts
 *
 * Development-only job seeding utility. Run via:
 * pnpm --filter careeros-api exec ts-node -r tsconfig-paths/register \
 * src/jobs/dev-seed-jobs.ts
 *
 * NEVER import this file from application code or production modules.
 * Guard it with a NODE_ENV check if called programmatically.
 */

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client';

if (process.env.NODE_ENV === 'production') {
  console.error('ERROR: dev-seed-jobs must not run in production.');
  process.exit(1);
}

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/careeros';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

interface SeedJob {
  externalId: string;
  source: string;
  company: string;
  title: string;
  location: string;
  isRemote: boolean;
  remotePolicy?: string;
  salaryRange?: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  postedAt: string;
}

const SEED_JOBS: SeedJob[] = [
  {
    externalId: 'seed-001',
    source: 'manual-dev-seed',
    company: 'Scale AI',
    title: 'Staff Fullstack & AI Systems Engineer',
    location: 'San Francisco, CA',
    isRemote: true,
    remotePolicy: 'REMOTE',
    salaryRange: '$190,000 - $240,000',
    description:
      "Build the infrastructure that powers Scale's data labeling and AI training platform. You will work on TypeScript and Python systems that handle large-scale ML pipelines.",
    requiredSkills: ['TypeScript', 'React', 'NestJS', 'PostgreSQL', 'Python'],
    preferredSkills: ['Kubernetes', 'Triton', 'LLM fine-tuning'],
    postedAt: '2026-08-07T10:00:00.000Z',
  },
  {
    externalId: 'seed-002',
    source: 'manual-dev-seed',
    company: 'Vercel',
    title: 'Senior Frontend Infrastructure Engineer',
    location: 'Remote (US/EU)',
    isRemote: true,
    remotePolicy: 'REMOTE',
    salaryRange: '$175,000 - $220,000',
    description:
      "Own the build and deployment infrastructure for Vercel's Next.js-based platform. Improve performance, developer experience, and design system tooling.",
    requiredSkills: ['Next.js', 'React', 'TypeScript', 'CSS', 'Performance'],
    preferredSkills: ['Edge Workers', 'Turbopack', 'Tailwind CSS'],
    postedAt: '2026-08-06T14:30:00.000Z',
  },
  {
    externalId: 'seed-003',
    source: 'manual-dev-seed',
    company: 'Anthropic',
    title: 'Distributed Systems & Backend Engineer',
    location: 'San Francisco, CA',
    isRemote: false,
    remotePolicy: 'ONSITE',
    salaryRange: '$200,000 - $260,000',
    description:
      'Design and scale the distributed systems that serve Claude and other Anthropic products. You will work closely with the research team on high-throughput inference infrastructure.',
    requiredSkills: [
      'Node.js',
      'PostgreSQL',
      'Redis',
      'Distributed Systems',
      'Python',
    ],
    preferredSkills: ['C++', 'Rust', 'gRPC'],
    postedAt: '2026-08-05T09:15:00.000Z',
  },
  {
    externalId: 'seed-004',
    source: 'manual-dev-seed',
    company: 'OpenAI',
    title: 'Lead AI Platform Engineer',
    location: 'San Francisco, CA',
    isRemote: true,
    remotePolicy: 'HYBRID',
    salaryRange: '$210,000 - $280,000',
    description:
      'Lead the platform team building tooling that enables researchers to iterate quickly on LLMs. Own BYOK integration, FastAPI microservices, and AI workflow orchestration.',
    requiredSkills: [
      'Python',
      'FastAPI',
      'TypeScript',
      'OpenAI API',
      'Vector Databases',
    ],
    preferredSkills: ['GPU Cluster Management', 'Kubernetes', 'Ray'],
    postedAt: '2026-08-08T08:00:00.000Z',
  },
  {
    externalId: 'seed-005',
    source: 'manual-dev-seed',
    company: 'Linear',
    title: 'Senior Product Engineer — Growth',
    location: 'Remote',
    isRemote: true,
    remotePolicy: 'REMOTE',
    salaryRange: '$160,000 - $200,000',
    description:
      "Work on Linear's web application and help build features that improve user onboarding, retention, and collaboration. Focus on shipping high-quality product experiences.",
    requiredSkills: ['React', 'TypeScript', 'GraphQL', 'CSS'],
    preferredSkills: ['Electron', 'PWA', 'Product analytics'],
    postedAt: '2026-08-04T12:00:00.000Z',
  },
];

async function seed(): Promise<void> {
  console.log('Seeding development jobs...');
  let created = 0;
  let updated = 0;

  for (const job of SEED_JOBS) {
    const data = {
      source: job.source,
      sourceUrl: undefined,
      company: job.company,
      title: job.title,
      location: job.location,
      isRemote: job.isRemote,
      remotePolicy: job.remotePolicy ?? null,
      salaryRange: job.salaryRange ?? null,
      description: job.description,
      requiredSkills: job.requiredSkills,
      preferredSkills: job.preferredSkills,
      postedAt: new Date(job.postedAt),
    };

    const existing = await prisma.job.findFirst({
      where: { source: job.source, externalId: job.externalId },
    });

    if (existing) {
      await prisma.job.update({ where: { id: existing.id }, data });
      updated++;
      console.log(` Updated: ${job.title} @ ${job.company}`);
    } else {
      await prisma.job.create({
        data: { ...data, externalId: job.externalId },
      });
      created++;
      console.log(` Created: ${job.title} @ ${job.company}`);
    }
  }

  console.log(`\nDone. Created: ${String(created)}, Updated: ${String(updated)}.`);
}

seed()
  .catch((err: unknown) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
