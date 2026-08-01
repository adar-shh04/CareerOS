import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

export class EncryptionConfigurationError extends Error {}

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor() {
    const keyHex =
      process.env.BYOK_ENCRYPTION_KEY ??
      (process.env.NODE_ENV === 'test'
        ? '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
        : undefined);

    if (keyHex?.length !== 64) {
      throw new EncryptionConfigurationError(
        'BYOK_ENCRYPTION_KEY must be a 32-byte hex string (64 characters).',
      );
    }

    this.key = Buffer.from(keyHex, 'hex');
  }

  encrypt(plaintext: string): {
    encryptedKey: string;
    iv: string;
    authTag: string;
  } {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return {
      encryptedKey: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  decrypt(encryptedKey: string, iv: string, authTag: string): string {
    const decipher = createDecipheriv(
      ALGORITHM,
      this.key,
      Buffer.from(iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));

    return Buffer.concat([
      decipher.update(Buffer.from(encryptedKey, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) {
      return '••••••••';
    }

    return `${apiKey.slice(0, 3)}••••${apiKey.slice(-4)}`;
  }
}
