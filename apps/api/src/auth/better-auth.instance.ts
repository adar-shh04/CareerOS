import { PrismaPg } from '@prisma/adapter-pg';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { bearer, organization } from 'better-auth/plugins';
import { Pool } from 'pg';

import { PrismaClient } from '../generated/prisma/client';

/**
 * Better Auth needs its own long-lived Prisma client instance (separate
 * from PrismaService, which is request/module scoped). This is fine —
 * it's a thin wrapper over the same connection pool config.
 */
const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://careeros:careeros@localhost:5432/careeros?schema=public';

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);

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
    database: {
      generateId: false,
    },

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

    organization({
      organizationCreation: {
        disabled: false,
        beforeCreate: ({
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
          const workspaceName =
            org.name ?? user.email.substring(0, user.email.indexOf('@'));

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
          const workspaceName = user.name
            ? `${user.name}'s Workspace`
            : 'My Career Workspace';
          const slug = `${slugify(user.name || user.email.split('@')[0])}-${Date.now().toString(36)}`;

          const org = await prisma.organization.create({
            data: {
              name: workspaceName,
              slug,
              members: {
                create: {
                  userId: user.id,
                  role: 'owner',
                },
              },
            },
          });

          // Immediately bind the new workspace to any sessions created during autoSignIn
          await prisma.session.updateMany({
            where: { userId: user.id },
            data: { activeOrganizationId: org.id },
          });
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          // Ensure every new session has an activeOrganizationId resolved
          if (!session.activeOrganizationId) {
            const member = await prisma.member.findFirst({
              where: { userId: session.userId },
              include: { organization: true },
            });
            if (member) {
              return {
                data: {
                  ...session,
                  activeOrganizationId: member.organizationId,
                },
              };
            }
          }
        },
      },
    },
  },
});

export type Auth = typeof auth;
