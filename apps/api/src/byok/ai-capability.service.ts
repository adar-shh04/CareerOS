import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ByokProvider } from './byok.dto';
import { ByokService } from './byok.service';

export interface ResolvedAiCapability {
  available: boolean;
  source?: 'byok' | 'platform';
  provider?: ByokProvider | 'openrouter';
  apiKey?: string;
  baseUrl?: string;
  reason?: string;
}

export interface AiCompletionOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

/** Why an AI result is unavailable: no provider, or the provider call failed. */
export type AiCompletionFailure = 'not_configured' | 'provider_error';

export interface AiCompletionResult {
  available: boolean;
  text?: string;
  reason?: string;
  failureReason?: AiCompletionFailure;
  provider?: string;
  source?: string;
}

@Injectable()
export class AiCapabilityService {
  private readonly logger = new Logger(AiCapabilityService.name);

  constructor(
    private readonly byokService: ByokService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Resolves whether an AI capability is available for the given workspace.
   * Priority:
   * 1. Workspace BYOK credential (openai, anthropic, google, mistral)
   * 2. Platform environment configuration (OPENROUTER_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, MISTRAL_API_KEY)
   */
  async resolveCapability(workspaceId: string): Promise<ResolvedAiCapability> {
    const providers: ByokProvider[] = [
      'openai',
      'anthropic',
      'google',
      'mistral',
    ];

    // 1. Check workspace BYOK credentials
    for (const provider of providers) {
      try {
        const apiKey = await this.byokService.getDecryptedKey(
          workspaceId,
          provider,
        );
        if (apiKey && apiKey.trim().length > 0) {
          return {
            available: true,
            source: 'byok',
            provider,
            apiKey: apiKey.trim(),
          };
        }
      } catch {
        // Continue checking other BYOK providers
      }
    }

    // 2. Check platform environment configuration
    const openrouterKey =
      this.configService.get<string>('OPENROUTER_API_KEY') ??
      process.env.OPENROUTER_API_KEY;
    if (openrouterKey && openrouterKey.trim().length > 0) {
      const baseUrl =
        this.configService.get<string>('OPENROUTER_BASE_URL') ??
        process.env.OPENROUTER_BASE_URL ??
        'https://openrouter.ai/api/v1';
      return {
        available: true,
        source: 'platform',
        provider: 'openrouter',
        apiKey: openrouterKey.trim(),
        baseUrl,
      };
    }

    const platformOpenAIKey =
      this.configService.get<string>('OPENAI_API_KEY') ??
      process.env.OPENAI_API_KEY;
    if (platformOpenAIKey && platformOpenAIKey.trim().length > 0) {
      return {
        available: true,
        source: 'platform',
        provider: 'openai',
        apiKey: platformOpenAIKey.trim(),
      };
    }

    const platformAnthropicKey =
      this.configService.get<string>('ANTHROPIC_API_KEY') ??
      process.env.ANTHROPIC_API_KEY;
    if (platformAnthropicKey && platformAnthropicKey.trim().length > 0) {
      return {
        available: true,
        source: 'platform',
        provider: 'anthropic',
        apiKey: platformAnthropicKey.trim(),
      };
    }

    const platformGoogleKey =
      this.configService.get<string>('GEMINI_API_KEY') ??
      this.configService.get<string>('GOOGLE_API_KEY') ??
      process.env.GEMINI_API_KEY ??
      process.env.GOOGLE_API_KEY;
    if (platformGoogleKey && platformGoogleKey.trim().length > 0) {
      return {
        available: true,
        source: 'platform',
        provider: 'google',
        apiKey: platformGoogleKey.trim(),
      };
    }

    const platformMistralKey =
      this.configService.get<string>('MISTRAL_API_KEY') ??
      process.env.MISTRAL_API_KEY;
    if (platformMistralKey && platformMistralKey.trim().length > 0) {
      return {
        available: true,
        source: 'platform',
        provider: 'mistral',
        apiKey: platformMistralKey.trim(),
      };
    }

    // 3. No AI capability configured
    return {
      available: false,
      reason:
        'AI provider not configured. Connect BYOK or enable a platform AI plan to use AI features.',
    };
  }

  /**
   * Capability-aware AI text completion handler.
   * Routes each provider strictly through its own canonical API semantics.
   */
  async generateCompletion(
    workspaceId: string,
    options: AiCompletionOptions,
  ): Promise<AiCompletionResult> {
    const cap = await this.resolveCapability(workspaceId);
    if (!cap.available || !cap.apiKey) {
      return {
        available: false,
        failureReason: 'not_configured',
        reason:
          cap.reason ??
          'AI provider not configured. Connect BYOK or enable a platform AI plan.',
      };
    }

    try {
      let text: string;

      switch (cap.provider) {
        case 'anthropic':
          text = await this.callAnthropicApi(cap.apiKey, options);
          break;
        case 'openrouter': {
          const baseUrl = cap.baseUrl ?? 'https://openrouter.ai/api/v1';
          text = await this.callOpenRouter(cap.apiKey, baseUrl, options);
          break;
        }
        case 'mistral':
          text = await this.callMistral(cap.apiKey, options);
          break;
        case 'google':
          text = await this.callGoogleGeminiApi(cap.apiKey, options);
          break;
        case 'openai':
        default:
          text = await this.callOpenAI(cap.apiKey, options);
          break;
      }

      return {
        available: true,
        text,
        provider: cap.provider,
        source: cap.source,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `AI completion failed (${String(cap.provider)}): ${msg}`,
      );
      return {
        available: false,
        failureReason: 'provider_error',
        reason: `AI provider call failed: ${msg}`,
      };
    }
  }

  private async callOpenAI(
    apiKey: string,
    options: AiCompletionOptions,
  ): Promise<string> {
    const model =
      this.configService.get<string>('OPENAI_MODEL') ??
      process.env.OPENAI_MODEL ??
      'gpt-4o-mini';
    return this.callOpenAICompatibleApi(
      'https://api.openai.com/v1/chat/completions',
      apiKey,
      model,
      options,
    );
  }

  private async callMistral(
    apiKey: string,
    options: AiCompletionOptions,
  ): Promise<string> {
    const model =
      this.configService.get<string>('MISTRAL_MODEL') ??
      process.env.MISTRAL_MODEL ??
      'mistral-small-latest';
    return this.callOpenAICompatibleApi(
      'https://api.mistral.ai/v1/chat/completions',
      apiKey,
      model,
      options,
    );
  }

  private async callOpenRouter(
    apiKey: string,
    baseUrl: string,
    options: AiCompletionOptions,
  ): Promise<string> {
    const model =
      this.configService.get<string>('OPENROUTER_DEFAULT_MODEL') ??
      process.env.OPENROUTER_DEFAULT_MODEL ??
      'openai/gpt-4o-mini';
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    return this.callOpenAICompatibleApi(
      `${cleanUrl}/chat/completions`,
      apiKey,
      model,
      options,
      {
        'HTTP-Referer': 'https://careeros.app',
        'X-Title': 'CareerOS',
      },
    );
  }

  private async callGoogleGeminiApi(
    apiKey: string,
    options: AiCompletionOptions,
  ): Promise<string> {
    const model =
      this.configService.get<string>('GEMINI_MODEL') ??
      process.env.GEMINI_MODEL ??
      'gemini-1.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const generationConfig: Record<string, unknown> = {
      temperature: options.temperature ?? 0.2,
      maxOutputTokens: options.maxTokens ?? 2000,
    };
    if (options.jsonMode) {
      generationConfig.responseMimeType = 'application/json';
    }

    const payload = {
      systemInstruction: {
        parts: [{ text: options.systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: options.userPrompt }],
        },
      ],
      generationConfig,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(
        `HTTP ${String(response.status)}: ${errText.slice(0, 200)}`,
      );
    }

    interface GeminiCandidate {
      content?: {
        parts?: { text?: string }[];
      };
    }
    interface GeminiResponse {
      candidates?: GeminiCandidate[];
      error?: { message?: string };
    }

    const data = (await response.json()) as GeminiResponse;
    if (data.error?.message) {
      throw new Error(`Google Gemini error: ${data.error.message}`);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Empty response from Google Gemini model');
    }

    return text.trim();
  }

  private async callOpenAICompatibleApi(
    endpoint: string,
    apiKey: string,
    model: string,
    options: AiCompletionOptions,
    extraHeaders: Record<string, string> = {},
  ): Promise<string> {
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userPrompt },
      ],
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 2000,
    };

    if (options.jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(
        `HTTP ${String(response.status)}: ${errText.slice(0, 200)}`,
      );
    }

    interface OpenAIFormat {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    }
    const data = (await response.json()) as OpenAIFormat;
    if (data.error?.message) {
      throw new Error(data.error.message);
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from AI model');
    return content.trim();
  }

  private async callAnthropicApi(
    apiKey: string,
    options: AiCompletionOptions,
  ): Promise<string> {
    const model =
      this.configService.get<string>('ANTHROPIC_MODEL') ??
      process.env.ANTHROPIC_MODEL ??
      'claude-3-5-haiku-20241022';

    const systemPrompt = options.jsonMode
      ? `${options.systemPrompt}\nReturn ONLY a raw, minified JSON object matching the requested schema. Do not wrap in markdown code blocks.`
      : options.systemPrompt;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: options.maxTokens ?? 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: options.userPrompt }],
        temperature: options.temperature ?? 0.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(
        `HTTP ${String(response.status)}: ${errText.slice(0, 200)}`,
      );
    }

    interface AnthropicFormat {
      content?: { text?: string }[];
      error?: { message?: string };
    }
    const data = (await response.json()) as AnthropicFormat;
    if (data.error?.message) {
      throw new Error(data.error.message);
    }

    const content = data.content?.[0]?.text;
    if (!content) throw new Error('Empty response from Anthropic model');
    return content.trim();
  }
}
