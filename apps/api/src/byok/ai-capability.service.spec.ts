import type { ConfigService } from '@nestjs/config';

import { AiCapabilityService } from './ai-capability.service';
import type { ByokService } from './byok.service';

describe('AiCapabilityService', () => {
  let service: AiCapabilityService;
  let mockByokService: {
    getDecryptedKey: jest.Mock;
  };
  let mockConfigService: {
    get: jest.Mock;
  };

  const workspaceId = 'ws-test-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockByokService = {
      getDecryptedKey: jest.fn().mockRejectedValue(new Error('Not configured')),
    };
    mockConfigService = {
      get: jest.fn().mockReturnValue(undefined),
    };
    service = new AiCapabilityService(
      mockByokService as unknown as ByokService,
      mockConfigService as unknown as ConfigService,
    );
  });

  describe('resolveCapability', () => {
    it('resolves workspace BYOK when configured', async () => {
      mockByokService.getDecryptedKey.mockImplementation((_ws, provider) => {
        if (provider === 'openai') return Promise.resolve('sk-openai-user-key');
        return Promise.reject(new Error('Not configured'));
      });

      const result = await service.resolveCapability(workspaceId);
      expect(result.available).toBe(true);
      expect(result.source).toBe('byok');
      expect(result.provider).toBe('openai');
      expect(result.apiKey).toBe('sk-openai-user-key');
    });

    it('resolves platform OpenRouter key when BYOK is absent', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'OPENROUTER_API_KEY') return 'sk-or-platform-key';
        return undefined;
      });

      const result = await service.resolveCapability(workspaceId);
      expect(result.available).toBe(true);
      expect(result.source).toBe('platform');
      expect(result.provider).toBe('openrouter');
      expect(result.apiKey).toBe('sk-or-platform-key');
    });

    it('returns honest capability-unavailable when neither BYOK nor platform keys exist', async () => {
      const result = await service.resolveCapability(workspaceId);
      expect(result.available).toBe(false);
      expect(result.reason).toContain('AI provider not configured');
    });
  });
});
