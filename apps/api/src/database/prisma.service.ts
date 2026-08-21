import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { PrismaClient } from '../generated/prisma/client';

export class DatabaseConfigurationError extends Error {}

@Injectable()
export class PrismaService implements OnModuleDestroy {
  private clientInstance: PrismaClient | undefined;

  get client(): PrismaClient {
    if (!this.clientInstance) {
      const connectionString = process.env.DATABASE_URL;

      if (!connectionString) {
        throw new DatabaseConfigurationError('DATABASE_URL is required.');
      }

      const pool = new Pool({ connectionString });
      this.clientInstance = new PrismaClient({
        adapter: new PrismaPg(pool),
      });
    }

    return this.clientInstance;
  }

  async onModuleDestroy(): Promise<void> {
    await this.clientInstance?.$disconnect();
  }
}
