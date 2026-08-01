import { PrismaPg } from '@prisma/adapter-pg';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { bearer, organization } from 'better-auth/plugins';

import { PrismaClient } from '../generated/prisma/client';

/**
 * Better Auth needs its own long-lived Prisma client instance (separate
 * from PrismaService, which is request/module scoped). This is fine —
 * it's a thin wrapper over the same connection pool config.
 */
const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://careeros:careeros@localhost:5432/careeros?schema=public';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  // Core "user" model is remapped onto our existing `users` table.
  // avatar (our column) <-> image (Better Auth's field name).
  user: {
    modelName: 'user',
    fields: {
      image: 'avatar',
    },
  },
  session: {
    modelName: 'session',
    expiresIn: 60 * 60 * 24 * 7, // 7 days, matches old refresh token lifetime
    updateAge: 60 * 60 * 24, // refresh the cookie once/day of activity
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 min in-memory cache so we're not hitting the DB every request
    },
  },
  account: {
    modelName: 'account',
  },
  verification: {
    modelName: 'verification',
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true, // sign the user in immediately after register, matches old behavior
  },

  trustedOrigins: process.env.CORS_ORIGIN?.split(',') ?? [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ],

  advanced: {
    // We're API-only (no server-rendered pages on this origin), and the
    // web app is a different origin in dev — cross-site cookies needed.
    crossSubDomainCookies: {
      enabled: false,
    },
    defaultCookieAttributes: {
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },

  plugins: [
    // Lets the Next.js BFF route handlers keep doing exactly what they did
    // before: read a token server-side and send `Authorization: Bearer
    // <token>` to this API, instead of forwarding cookies cross-origin.
    // Better Auth returns this token in the `set-auth-token` response
    // header on sign-in — see apps/web/lib/auth-client.ts.
    bearer(),

    // This is the key remap: Better Auth's "organization" concept IS our
    // existing Workspace/WorkspaceMember tables, not a new parallel set.
    organization({
      schema: {
        organization: {
          modelName: 'workspace',
          fields: {
            name: 'name',
            slug: 'slug',
            logo: 'logo',
          },
        },
        member: {
          modelName: 'workspaceMember',
          fields: {
            organizationId: 'workspaceId',
            userId: 'userId',
            role: 'role',
          },
        },
      },
      // Every new user needs exactly one workspace, created at signup —
      // this replaces the $transaction block that used to live in
      // auth.service.ts#register.
      organizationCreation: {
        disabled: false,
        beforeCreate: async ({
          organization: org,
          user,
        }: {
          organization: {
            name?: string;
            slug?: string;
            logo?: string | null;
          };
          user: { email: string };
        }) => {
          const workspaceName = org.name || user.email.split('@')[0] || 'workspace';

          return {
            data: {
              ...org,
              slug: `${slugify(workspaceName)}-${Date.now().toString(36)}`,
            },
          };
        },
      },
      creatorRole: 'owner',
      allowUserToCreateOrganization: true,
    }),
  ],

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Auto-create the user's first workspace, mirroring the old
          // register() flow (one workspace per new account, owner role).
          await auth.api.createOrganization({
            body: {
              name: user.name ? `${user.name}'s Workspace` : 'My Career Workspace',
              slug: `${slugify(user.name || user.email.split('@')[0] || 'workspace')}-${Date.now().toString(36)}`,
              userId: user.id,
            },
          });
        },
      },
    },
  },
});

export type Auth = typeof auth;
