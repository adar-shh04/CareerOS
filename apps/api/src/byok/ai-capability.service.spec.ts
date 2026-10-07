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
  const originalFetch = global.fetch;

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

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('resolveCapability', () => {
    it('resolves workspace BYOK OpenAI when configured', async () => {
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

    it('resolves workspace BYOK Anthropic when configured', async () => {
      mockByokService.getDecryptedKey.mockImplementation((_ws, provider) => {
        if (provider === 'anthropic') return Promise.resolve('sk-ant-user-key');
        return Promise.reject(new Error('Not configured'));
      });

      const result = await service.resolveCapability(workspaceId);
      expect(result.available).toBe(true);
      expect(result.source).toBe('byok');
      expect(result.provider).toBe('anthropic');
      expect(result.apiKey).toBe('sk-ant-user-key');
    });

    it('resolves workspace BYOK Google Gemini when configured', async () => {
      mockByokService.getDecryptedKey.mockImplementation((_ws, provider) => {
        if (provider === 'google') return Promise.resolve('AIza-gemini-key');
        return Promise.reject(new Error('Not configured'));
      });

      const result = await service.resolveCapability(workspaceId);
      expect(result.available).toBe(true);
      expect(result.source).toBe('byok');
      expect(result.provider).toBe('google');
      expect(result.apiKey).toBe('AIza-gemini-key');
    });

    it('resolves workspace BYOK Mistral when configured', async () => {
      mockByokService.getDecryptedKey.mockImplementation((_ws, provider) => {
        if (provider === 'mistral') return Promise.resolve('mistral-user-key');
        return Promise.reject(new Error('Not configured'));
      });

      const result = await service.resolveCapability(workspaceId);
      expect(result.available).toBe(true);
      expect(result.source).toBe('byok');
      expect(result.provider).toBe('mistral');
      expect(result.apiKey).toBe('mistral-user-key');
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

    it('resolves platform Gemini key when OPENROUTER is absent', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'GEMINI_API_KEY') return 'AIza-platform-gemini';
        return undefined;
      });

      const result = await service.resolveCapability(workspaceId);
      expect(result.available).toBe(true);
      expect(result.source).toBe('platform');
      expect(result.provider).toBe('google');
      expect(result.apiKey).toBe('AIza-platform-gemini');
    });

    it('resolves platform Mistral key when others are absent', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'MISTRAL_API_KEY') return 'mistral-platform-key';
        return undefined;
      });

      const result = await service.resolveCapability(workspaceId);
      expect(result.available).toBe(true);
      expect(result.source).toBe('platform');
      expect(result.provider).toBe('mistral');
      expect(result.apiKey).toBe('mistral-platform-key');
    });

    it('returns honest capability-unavailable when neither BYOK nor platform keys exist', async () => {
      const result = await service.resolveCapability(workspaceId);
      expect(result.available).toBe(false);
      expect(result.reason).toContain('AI provider not configured');
    });
  });

  describe('generateCompletion', () => {
    it('returns not_configured when no capability exists', async () => {
      const result = await service.generateCompletion(workspaceId, {
        systemPrompt: 'System',
        userPrompt: 'Hello',
      });
      expect(result.available).toBe(false);
      expect(result.failureReason).toBe('not_configured');
    });

    it('routes OpenAI requests to api.openai.com with correct format and bearer auth', async () => {
      mockByokService.getDecryptedKey.mockImplementation((_ws, provider) => {
        if (provider === 'openai') return Promise.resolve('sk-openai-test');
        return Promise.reject(new Error('Not configured'));
      });

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: '{"answer": "openai-ok"}' } }],
          }),
      });
      global.fetch = mockFetch as unknown as typeof fetch;

      const result = await service.generateCompletion(workspaceId, {
        systemPrompt: 'You are helpful',
        userPrompt: 'Tell me a joke',
        jsonMode: true,
      });

      expect(result.available).toBe(true);
      expect(result.text).toBe('{"answer": "openai-ok"}');
      expect(result.provider).toBe('openai');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const firstCall = mockFetch.mock.calls[0] as unknown as [
        string,
        { headers: Record<string, string>; body: string },
      ];
      const [url, requestInit] = firstCall;
      expect(url).toBe('https://api.openai.com/v1/chat/completions');
      expect(requestInit.headers.Authorization).toBe('Bearer sk-openai-test');
      const body = JSON.parse(requestInit.body) as {
        response_format?: { type: string };
        messages: { content: string }[];
      };
      expect(body.response_format).toEqual({ type: 'json_object' });
      expect(body.messages[0]?.content).toBe('You are helpful');
      expect(body.messages[1]?.content).toBe('Tell me a joke');
    });

    it('routes Mistral requests to api.mistral.ai with mistral-small-latest model', async () => {
      mockByokService.getDecryptedKey.mockImplementation((_ws, provider) => {
        if (provider === 'mistral') return Promise.resolve('mistral-test-key');
        return Promise.reject(new Error('Not configured'));
      });

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'mistral-response' } }],
          }),
      });
      global.fetch = mockFetch as unknown as typeof fetch;

      const result = await service.generateCompletion(workspaceId, {
        systemPrompt: 'System',
        userPrompt: 'Hello Mistral',
      });

      expect(result.available).toBe(true);
      expect(result.text).toBe('mistral-response');
      expect(result.provider).toBe('mistral');

      const firstCall = mockFetch.mock.calls[0] as unknown as [
        string,
        { headers: Record<string, string>; body: string },
      ];
      const [url, requestInit] = firstCall;
      expect(url).toBe('https://api.mistral.ai/v1/chat/completions');
      expect(requestInit.headers.Authorization).toBe('Bearer mistral-test-key');
      const body = JSON.parse(requestInit.body) as { model?: string };
      expect(body.model).toBe('mistral-small-latest');
    });

    it('routes Google Gemini requests to generativelanguage.googleapis.com with key in URL and generationConfig', async () => {
      mockByokService.getDecryptedKey.mockImplementation((_ws, provider) => {
        if (provider === 'google') return Promise.resolve('AIza-google-key');
        return Promise.reject(new Error('Not configured'));
      });

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [
              {
                content: {
                  parts: [{ text: '{"analysis": "gemini-success"}' }],
                },
              },
            ],
          }),
      });
      global.fetch = mockFetch as unknown as typeof fetch;

      const result = await service.generateCompletion(workspaceId, {
        systemPrompt: 'System gemini',
        userPrompt: 'Prompt gemini',
        jsonMode: true,
      });

      expect(result.available).toBe(true);
      expect(result.text).toBe('{"analysis": "gemini-success"}');
      expect(result.provider).toBe('google');

      const firstCall = mockFetch.mock.calls[0] as unknown as [
        string,
        { headers: Record<string, string>; body: string },
      ];
      const [url, requestInit] = firstCall;
      expect(url).toContain(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
      );
      expect(url).toContain('key=AIza-google-key');
      const body = JSON.parse(requestInit.body) as {
        systemInstruction: { parts: { text: string }[] };
        contents: { parts: { text: string }[] }[];
        generationConfig: { responseMimeType?: string };
      };
      expect(body.systemInstruction.parts[0]?.text).toBe('System gemini');
      expect(body.contents[0]?.parts[0]?.text).toBe('Prompt gemini');
      expect(body.generationConfig.responseMimeType).toBe('application/json');
    });

    it('routes Anthropic requests to api.anthropic.com with x-api-key and anthropic-version', async () => {
      mockByokService.getDecryptedKey.mockImplementation((_ws, provider) => {
        if (provider === 'anthropic')
          return Promise.resolve('sk-ant-anthropic-key');
        return Promise.reject(new Error('Not configured'));
      });

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            content: [{ text: 'anthropic-completion-ok' }],
          }),
      });
      global.fetch = mockFetch as unknown as typeof fetch;

      const result = await service.generateCompletion(workspaceId, {
        systemPrompt: 'System anthropic',
        userPrompt: 'Prompt anthropic',
      });

      expect(result.available).toBe(true);
      expect(result.text).toBe('anthropic-completion-ok');
      expect(result.provider).toBe('anthropic');

      const firstCall = mockFetch.mock.calls[0] as unknown as [
        string,
        { headers: Record<string, string>; body: string },
      ];
      const [url, requestInit] = firstCall;
      expect(url).toBe('https://api.anthropic.com/v1/messages');
      expect(requestInit.headers['x-api-key']).toBe('sk-ant-anthropic-key');
      expect(requestInit.headers['anthropic-version']).toBe('2023-06-01');
      const body = JSON.parse(requestInit.body) as { model?: string };
      expect(body.model).toBe('claude-3-5-haiku-20241022');
    });

    it('routes OpenRouter requests with required HTTP-Referer and X-Title headers', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'OPENROUTER_API_KEY') return 'sk-or-platform-key';
        return undefined;
      });

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'openrouter-ok' } }],
          }),
      });
      global.fetch = mockFetch as unknown as typeof fetch;

      const result = await service.generateCompletion(workspaceId, {
        systemPrompt: 'Sys',
        userPrompt: 'User',
      });

      expect(result.available).toBe(true);
      expect(result.text).toBe('openrouter-ok');

      const firstCall = mockFetch.mock.calls[0] as unknown as [
        string,
        { headers: Record<string, string>; body: string },
      ];
      const [url, requestInit] = firstCall;
      expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
      expect(requestInit.headers['HTTP-Referer']).toBe('https://careeros.app');
      expect(requestInit.headers['X-Title']).toBe('CareerOS');
    });

    it('handles provider error status codes gracefully without throwing', async () => {
      mockByokService.getDecryptedKey.mockImplementation((_ws, provider) => {
        if (provider === 'openai') return Promise.resolve('sk-bad-key');
        return Promise.reject(new Error('Not configured'));
      });

      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Incorrect API key provided'),
      });
      global.fetch = mockFetch as unknown as typeof fetch;

      const result = await service.generateCompletion(workspaceId, {
        systemPrompt: 'Sys',
        userPrompt: 'User',
      });

      expect(result.available).toBe(false);
      expect(result.failureReason).toBe('provider_error');
      expect(result.reason).toContain('HTTP 401');
    });
  });
});
