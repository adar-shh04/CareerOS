import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import type { ByokProvider } from './byok.dto';
import { EncryptionService } from './encryption.service';

export interface ByokCredentialSummary {
  provider: ByokProvider;
  configured: boolean;
  maskedKey: string | null;
  updatedAt: string;
}

@Injectable()
export class ByokService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async listForWorkspace(
    workspaceId: string,
  ): Promise<ByokCredentialSummary[]> {
    const credentials = await this.prisma.client.byokCredential.findMany({
      where: { organizationId: workspaceId },
      orderBy: { provider: 'asc' },
    });

    return credentials.map((credential) => ({
      provider: credential.provider as ByokProvider,
      configured: true,
      maskedKey: this.encryption.maskApiKey(
        this.encryption.decrypt(
          credential.encryptedKey,
          credential.iv,
          credential.authTag,
        ),
      ),
      updatedAt: credential.updatedAt.toISOString(),
    }));
  }

  async storeCredential(
    workspaceId: string,
    provider: ByokProvider,
    apiKey: string,
  ): Promise<ByokCredentialSummary> {
    const encrypted = this.encryption.encrypt(apiKey);

    const credential = await this.prisma.client.byokCredential.upsert({
      where: {
        organizationId_provider: {
          organizationId: workspaceId,
          provider,
        },
      },
      create: {
        organizationId: workspaceId,
        provider,
        encryptedKey: encrypted.encryptedKey,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
      },
      update: {
        encryptedKey: encrypted.encryptedKey,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
      },
    });

    return {
      provider,
      configured: true,
      maskedKey: this.encryption.maskApiKey(apiKey),
      updatedAt: credential.updatedAt.toISOString(),
    };
  }

  async deleteCredential(
    workspaceId: string,
    provider: ByokProvider,
  ): Promise<void> {
    const existing = await this.prisma.client.byokCredential.findUnique({
      where: {
        organizationId_provider: {
          organizationId: workspaceId,
          provider,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Credential not found.');
    }

    await this.prisma.client.byokCredential.delete({
      where: { id: existing.id },
    });
  }

  async getDecryptedKey(
    workspaceId: string,
    provider: ByokProvider,
  ): Promise<string> {
    const credential = await this.prisma.client.byokCredential.findUnique({
      where: {
        organizationId_provider: {
          organizationId: workspaceId,
          provider,
        },
      },
    });

    if (!credential) {
      throw new NotFoundException('Credential not configured.');
    }

    return this.encryption.decrypt(
      credential.encryptedKey,
      credential.iv,
      credential.authTag,
    );
  }

  assertWorkspaceAccess(userWorkspaceId: string, workspaceId: string): void {
    if (userWorkspaceId !== workspaceId) {
      throw new ForbiddenException('Workspace access denied.');
    }
  }
}
