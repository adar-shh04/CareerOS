import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      BYOK_ENCRYPTION_KEY:
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('encrypts and decrypts API keys with AES-256-GCM', () => {
    const service = new EncryptionService();
    const plaintext = 'sk-proj-test-key-abcdefghijklmnopqrstuvwxyz';

    const encrypted = service.encrypt(plaintext);
    const decrypted = service.decrypt(
      encrypted.encryptedKey,
      encrypted.iv,
      encrypted.authTag,
    );

    expect(decrypted).toBe(plaintext);
    expect(encrypted.encryptedKey).not.toContain(plaintext);
  });

  it('masks API keys for safe API responses', () => {
    const service = new EncryptionService();
    const masked = service.maskApiKey('sk-proj-abc123xyz789');

    expect(masked).toBe('sk-••••z789');
    expect(masked).not.toContain('abc123');
  });
});
