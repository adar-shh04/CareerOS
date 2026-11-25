import type { ConfigService } from '@nestjs/config';

import { AiCapabilityService } from './ai-capability.service';
import type { ByokService } from './byok.service';

/**
 * Guards the shape of the outbound vendor request built by
 * AiCapabilityService (POST /chat/completions at api.openai.com).
 *
 * OpenAI deprecated the `max_tokens` Chat Completions parameter in favour of
 * `max_completion_tokens`; newer models reject `max_tokens` outright. The
 * OpenAI-compatible providers (Mistral, OpenRouter) still expect `max_tokens`,
 * so only the OpenAI path may use the new field.
 */
describe('AiCapabilityService outbound chat completion request', () => {
  const workspaceId = 'ws-request-format';
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function createService(provider: 'openai' | 'mistral', apiKey: string) {
    const byokService = {
      getDecryptedKey: jest.fn((_workspace: string, requested: string) =>
        requested === provider
          ? Promise.resolve(apiKey)
          : Promise.reject(new Error('Not configured')),
      ),
    };
    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    };
    return new AiCapabilityService(
      byokService as unknown as ByokService,
      configService as unknown as ConfigService,
    );
  }

  function mockChatCompletion() {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: 'request-ok' } }],
        }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;
    return mockFetch;
  }

  it('sends max_completion_tokens, not the deprecated max_tokens, to OpenAI', async () => {
    const service = createService('openai', 'sk-openai-test');
    const mockFetch = mockChatCompletion();

    const result = await service.generateCompletion(workspaceId, {
      systemPrompt: 'You are helpful',
      userPrompt: 'Hello OpenAI',
      maxTokens: 64,
    });

    expect(result.available).toBe(true);

    const [url, requestInit] = mockFetch.mock.calls[0] as unknown as [
      string,
      { body: string },
    ];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');

    const body = JSON.parse(requestInit.body) as Record<string, unknown>;
    expect(body.max_completion_tokens).toBe(64);
    expect(body).not.toHaveProperty('max_tokens');
  });

  it('keeps max_tokens for OpenAI-compatible providers that still require it', async () => {
    const service = createService('mistral', 'mistral-test-key');
    const mockFetch = mockChatCompletion();

    await service.generateCompletion(workspaceId, {
      systemPrompt: 'You are helpful',
      userPrompt: 'Hello Mistral',
      maxTokens: 64,
    });

    const [, requestInit] = mockFetch.mock.calls[0] as unknown as [
      string,
      { body: string },
    ];
    expect(JSON.parse(requestInit.body)).toMatchObject({ max_tokens: 64 });
  });
});
